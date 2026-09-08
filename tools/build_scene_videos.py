#!/usr/bin/env python3
"""Build privacy-preserving scene videos for the Spheriverse homepage.

The fix_6 metadata provides the major/fine scene taxonomy and the source
sequence folders. Faces are detected with YuNet, Chinese license plates with
a dedicated YOLOv8 model, and short-lived detections are propagated across
adjacent frames to avoid flickering masks.
"""

from __future__ import annotations

import argparse
import json
import os
import pickle
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np


TRAIN_PKL = Path(
    "/root/autodl-tmp/public/public-b/Panoword/spheriverse_pkl/"
    "fix_6spheriverse_train_mini.pkl"
)
VAL_PKL = Path(
    "/root/autodl-tmp/public/public-b/Panoword/spheriverse_pkl/"
    "fix_6spheriverse_val_mini.pkl"
)
FACE_MODEL = Path(
    "/tmp/spheriverse_privacy_models/face_detection_yunet_2023mar.onnx"
)
PLATE_REPO = Path("/tmp/spheriverse_plate_model")
PLATE_MODEL = PLATE_REPO / "weights/yolov8s.pt"


# The sequence IDs were chosen automatically within each fix_6 category using
# continuity, exposure, sharpness, colour, and motion scores. Sequence 525 was
# additionally selected for the long clip by its high traffic-participant count.
SCENES = [
    {
        "major_id": 1,
        "major": "Urban Core and Mixed-Use Zones",
        "items": [
            ("1.1", "Central Functional Zone", "central functional zone", 294),
            (
                "1.2",
                "Mixed Residential–Commercial Districts",
                "mixed residential commercial districts",
                526,
            ),
        ],
    },
    {
        "major_id": 2,
        "major": "Expressway Corridors and Peri-urban Areas",
        "items": [
            (
                "2.1",
                "Cross-Regional Expressway Corridors",
                "cross-regional expressway corridors",
                44,
            ),
            (
                "2.2",
                "Urban–Rural Interface Zones",
                "urban–rural interface zones",
                354,
            ),
        ],
    },
    {
        "major_id": 3,
        "major": "Functional and Restricted Operational Areas",
        "items": [
            ("3.1", "Waterfront Areas", "waterfront areas", 28),
            ("3.2", "Construction Zone", "construction zone", 541),
        ],
    },
    {
        "major_id": 4,
        "major": "Structurally Constrained Transportation Areas",
        "items": [
            (
                "4.1",
                "Elevated Bridge Environments",
                "levated bridge environments",
                64,
            ),
            (
                "4.2",
                "Underground Confined Environments",
                "underground confined environments",
                693,
            ),
            (
                "4.3",
                "Multi-Level Structural Spaces",
                "multi-level structural spaces",
                324,
            ),
        ],
    },
    {
        "major_id": 5,
        "major": "Rural and Natural Passage Environments",
        "items": [
            ("5.1", "Rural Roads", "rural roads", 364),
            ("5.2", "Forest Tracks", "forest tracks", 437),
            ("5.3", "Village Access Lanes", "village access lanes", 380),
            ("5.4", "Farm Field Tracks", "farm field tracks", 419),
        ],
    },
]

CONTINUOUS_SEQUENCE = 525


def normalize_label(value: str) -> str:
    normalized = value.lower().replace("–", "-").replace("—", "-").strip()
    if normalized.startswith("levated bridge"):
        normalized = "e" + normalized
    return normalized


def load_sequences() -> dict[int, dict]:
    sequences: dict[int, dict] = {}
    for pkl_path in (TRAIN_PKL, VAL_PKL):
        with pkl_path.open("rb") as handle:
            payload = pickle.load(handle)
        for info in payload["infos"]:
            scene = info["scenes"]
            scene_id = int(scene["scene_id"])
            entry = sequences.setdefault(
                scene_id,
                {
                    "major": scene["scene_idx1"],
                    "fine": scene["scene_idx2"],
                    "folder": Path(info["cams"]["CAM_FRONT"]["data_path"]).parent,
                },
            )
            if normalize_label(entry["fine"]) != normalize_label(scene["scene_idx2"]):
                raise RuntimeError(f"Inconsistent taxonomy for sequence {scene_id}")
    return sequences


def image_paths(folder: Path) -> list[Path]:
    paths = sorted(
        path
        for path in folder.iterdir()
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if len(paths) < 25:
        raise RuntimeError(f"Only {len(paths)} frames found in {folder}")
    return paths


def frame_quality(path: Path) -> float:
    frame = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if frame is None:
        return -1e6
    frame = cv2.resize(frame, (640, 244), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    sharpness = np.log1p(cv2.Laplacian(gray, cv2.CV_32F).var())
    exposure = 1.0 - abs(float(gray.mean()) - 125.0) / 125.0
    saturation = float(cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)[..., 1].mean()) / 255.0
    return float(sharpness * 0.8 + exposure * 2.0 + saturation * 1.2)


def best_window(paths: list[Path], length: int = 25) -> list[Path]:
    if len(paths) <= length:
        return paths
    candidates = range(0, len(paths) - length + 1, 5)
    start = max(
        candidates,
        key=lambda idx: np.mean(
            [
                frame_quality(paths[idx]),
                frame_quality(paths[idx + length // 2]),
                frame_quality(paths[idx + length - 1]),
            ]
        ),
    )
    return paths[start : start + length]


def iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    if not intersection:
        return 0.0
    area_a = max(1, a[2] - a[0]) * max(1, a[3] - a[1])
    area_b = max(1, b[2] - b[0]) * max(1, b[3] - b[1])
    return intersection / float(area_a + area_b - intersection)


def nms(boxes: list[dict], threshold: float = 0.35) -> list[dict]:
    output: list[dict] = []
    for candidate in sorted(boxes, key=lambda item: item["score"], reverse=True):
        if all(
            candidate["kind"] != kept["kind"]
            or iou(candidate["box"], kept["box"]) < threshold
            for kept in output
        ):
            output.append(candidate)
    return output


def expand_box(
    box: tuple[int, int, int, int],
    width: int,
    height: int,
    expand_x: float,
    expand_y: float,
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    dx = (x2 - x1) * expand_x
    dy = (y2 - y1) * expand_y
    return (
        max(0, int(x1 - dx)),
        max(0, int(y1 - dy)),
        min(width, int(x2 + dx)),
        min(height, int(y2 + dy)),
    )


class PrivacyFilter:
    def __init__(self, device: int = 3):
        if str(PLATE_REPO) not in sys.path:
            sys.path.insert(0, str(PLATE_REPO))
        from ultralytics import YOLO

        self.plate = YOLO(str(PLATE_MODEL))
        self.device = device
        self.face = cv2.FaceDetectorYN_create(
            str(FACE_MODEL), "", (512, 488), 0.55, 0.3, 5000
        )
        self.memory: list[dict] = []

    @staticmethod
    def circular_crops(frame: np.ndarray):
        width = frame.shape[1]
        for start in (-128, 128, 384, 640, 896):
            indexes = np.mod(np.arange(start, start + 512), width)
            yield start, frame[:, indexes]

    @staticmethod
    def map_circular_box(
        start: int,
        box: np.ndarray,
        width: int,
        height: int,
        kind: str,
        score: float,
    ) -> list[dict]:
        x1, y1, x2, y2 = [float(v) for v in box]
        y1, y2 = max(0, int(y1)), min(height, int(y2))
        gx1, gx2 = start + x1, start + x2
        cycle1 = int(np.floor(gx1 / width))
        cycle2 = int(np.floor(max(gx1, gx2 - 1e-4) / width))
        if cycle1 == cycle2:
            return [
                {
                    "box": (int(gx1 % width), y1, int(gx2 % width), y2),
                    "kind": kind,
                    "score": score,
                }
            ]
        return [
            {"box": (int(gx1 % width), y1, width, y2), "kind": kind, "score": score},
            {"box": (0, y1, int(gx2 % width), y2), "kind": kind, "score": score},
        ]

    def detect(self, frame: np.ndarray) -> list[dict]:
        height, width = frame.shape[:2]
        crops = list(self.circular_crops(frame))
        detections: list[dict] = []

        plate_results = self.plate.predict(
            [crop for _, crop in crops],
            imgsz=640,
            conf=0.18,
            iou=0.45,
            device=self.device,
            verbose=False,
        )
        for (start, _), result in zip(crops, plate_results):
            for box, confidence in zip(
                result.boxes.xyxy.cpu().numpy(), result.boxes.conf.cpu().numpy()
            ):
                box_width = float(box[2] - box[0])
                box_height = float(box[3] - box[1])
                aspect = box_width / max(1.0, box_height)
                if not (1.05 <= aspect <= 7.5):
                    continue
                if box_width > width * 0.18 or box_height > height * 0.12:
                    continue
                detections.extend(
                    self.map_circular_box(
                        start, box, width, height, "plate", float(confidence)
                    )
                )

        for start, crop in crops:
            _, faces = self.face.detect(crop)
            if faces is None:
                continue
            for face in faces:
                x, y, w, h = face[:4]
                aspect = float(w) / max(1.0, float(h))
                if not (0.58 <= aspect <= 1.72):
                    continue
                if w > width * 0.11 or h > height * 0.24:
                    continue
                detections.extend(
                    self.map_circular_box(
                        start,
                        np.array([x, y, x + w, y + h]),
                        width,
                        height,
                        "face",
                        float(face[-1]),
                    )
                )

        expanded: list[dict] = []
        for item in nms(detections):
            ex, ey = (0.24, 0.55) if item["kind"] == "plate" else (0.30, 0.38)
            item["box"] = expand_box(item["box"], width, height, ex, ey)
            expanded.append(item)
        return expanded

    def stabilize(self, current: list[dict]) -> list[dict]:
        result = list(current)
        next_memory = [dict(item, ttl=2) for item in current]
        for old in self.memory:
            matched = any(
                old["kind"] == new["kind"] and iou(old["box"], new["box"]) > 0.12
                for new in current
            )
            if not matched and old["ttl"] > 0:
                carried = dict(old)
                carried["ttl"] -= 1
                carried["score"] *= 0.85
                result.append(carried)
                next_memory.append(carried)
        result = nms(result, threshold=0.4)
        self.memory = nms(next_memory, threshold=0.4)
        return result

    @staticmethod
    def mosaic(frame: np.ndarray, box: tuple[int, int, int, int]) -> None:
        x1, y1, x2, y2 = box
        if x2 <= x1 or y2 <= y1:
            return
        region = frame[y1:y2, x1:x2]
        blocks_x = max(1, min(12, region.shape[1] // 7))
        blocks_y = max(1, min(8, region.shape[0] // 7))
        pixelated = cv2.resize(region, (blocks_x, blocks_y), interpolation=cv2.INTER_AREA)
        frame[y1:y2, x1:x2] = cv2.resize(
            pixelated, (region.shape[1], region.shape[0]), interpolation=cv2.INTER_NEAREST
        )

    def apply(self, frame: np.ndarray) -> tuple[np.ndarray, int, int]:
        detections = self.stabilize(self.detect(frame))
        faces = sum(item["kind"] == "face" for item in detections)
        plates = sum(item["kind"] == "plate" for item in detections)
        for item in detections:
            self.mosaic(frame, item["box"])
        return frame, faces, plates

    def reset(self):
        self.memory = []


def video_writer(output: Path, width: int, height: int, fps: int = 5):
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{width}x{height}",
        "-r",
        str(fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "25",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output),
    ]
    return subprocess.Popen(command, stdin=subprocess.PIPE)


def encode_clip(
    paths: list[Path],
    video_path: Path,
    poster_path: Path,
    privacy: PrivacyFilter,
    width: int = 1280,
) -> dict:
    height = 488
    privacy.reset()
    process = video_writer(video_path, width, height)
    totals = defaultdict(int)
    try:
        for index, path in enumerate(paths):
            frame = cv2.imread(str(path), cv2.IMREAD_COLOR)
            if frame is None:
                raise RuntimeError(f"Could not read {path}")
            frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            frame, faces, plates = privacy.apply(frame)
            totals["faces"] += faces
            totals["plates"] += plates
            if index == 0:
                cv2.imwrite(
                    str(poster_path),
                    frame,
                    [cv2.IMWRITE_WEBP_QUALITY, 82],
                )
            process.stdin.write(frame.tobytes())
    finally:
        if process.stdin:
            process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for {video_path}")
    return dict(totals)


def verify_taxonomy(expected: str, actual: str, scene_id: int):
    if normalize_label(expected) != normalize_label(actual):
        raise RuntimeError(
            f"Sequence {scene_id}: expected '{expected}', found '{actual}'"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", type=int, default=3)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    for required in (TRAIN_PKL, VAL_PKL, FACE_MODEL, PLATE_MODEL):
        if not required.exists():
            raise FileNotFoundError(required)

    sequences = load_sequences()
    video_dir = args.repo / "assets" / "videos" / "scenes"
    poster_dir = args.repo / "assets" / "images" / "scenes"
    video_dir.mkdir(parents=True, exist_ok=True)
    poster_dir.mkdir(parents=True, exist_ok=True)
    privacy = PrivacyFilter(device=args.device)
    manifest = {"source": "fix_6", "fps": 5, "major_categories": []}

    for group in SCENES:
        manifest_group = {
            "id": group["major_id"],
            "name": group["major"],
            "environments": [],
        }
        for code, title, expected_fine, scene_id in group["items"]:
            metadata = sequences[scene_id]
            verify_taxonomy(expected_fine, metadata["fine"], scene_id)
            paths = best_window(image_paths(metadata["folder"]), 25)
            slug = code.replace(".", "-") + "-" + expected_fine.replace(" ", "-").replace("–", "-")
            video = video_dir / f"{slug}.mp4"
            poster = poster_dir / f"{slug}.webp"
            if args.skip_existing and video.exists() and poster.exists():
                privacy_counts = {"faces": None, "plates": None}
            else:
                print(f"[{code}] sequence {scene_id}: {title}", flush=True)
                privacy_counts = encode_clip(paths, video, poster, privacy)
            manifest_group["environments"].append(
                {
                    "code": code,
                    "name": title,
                    "sequence": scene_id,
                    "frames": len(paths),
                    "video": str(video.relative_to(args.repo)),
                    "poster": str(poster.relative_to(args.repo)),
                    "privacy_detections": privacy_counts,
                }
            )
        manifest["major_categories"].append(manifest_group)

    continuous = sequences[CONTINUOUS_SEQUENCE]
    verify_taxonomy(
        "mixed residential commercial districts",
        continuous["fine"],
        CONTINUOUS_SEQUENCE,
    )
    long_paths = image_paths(continuous["folder"])
    long_video = args.repo / "assets" / "videos" / "continuous-drive-anonymized.mp4"
    long_poster = args.repo / "assets" / "images" / "continuous-drive-anonymized.webp"
    if args.skip_existing and long_video.exists() and long_poster.exists():
        long_counts = {"faces": None, "plates": None}
    else:
        print(f"[continuous] sequence {CONTINUOUS_SEQUENCE}", flush=True)
        long_counts = encode_clip(long_paths, long_video, long_poster, privacy)
    manifest["continuous_drive"] = {
        "sequence": CONTINUOUS_SEQUENCE,
        "major": continuous["major"],
        "environment": continuous["fine"],
        "frames": len(long_paths),
        "video": str(long_video.relative_to(args.repo)),
        "poster": str(long_poster.relative_to(args.repo)),
        "privacy_detections": long_counts,
    }

    manifest_path = args.repo / "assets" / "scene_videos_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {manifest_path}")


if __name__ == "__main__":
    main()
