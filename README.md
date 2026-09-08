# Spheriverse project homepage

This is a framework-free static website. It can be previewed locally and published directly with GitHub Pages.

## Preview in VS Code

From this directory, run:

```bash
bash preview.sh
```

Then open `http://localhost:8000` in the VS Code integrated browser or forward port `8000` from the **Ports** panel.

## Scene videos and privacy filtering

The scene explorer contains 13 five-second clips selected from the five major
and 13 fine-grained labels stored in the `fix_6` PKL metadata. A separate
20-second sequence is used for the continuous-drive section. All 14 clips are
processed frame by frame with face and Chinese license-plate detectors,
circular ERP boundary handling, and short-term temporal mask propagation.

The selected sequences, output paths, and privacy-detection counts are recorded
in `assets/scene_videos_manifest.json`. The generation pipeline is preserved in
`tools/build_scene_videos.py`.

## Publish with GitHub Pages

Push the contents of this directory to a GitHub repository, then select `Settings → Pages → Deploy from a branch → main / (root)`.
