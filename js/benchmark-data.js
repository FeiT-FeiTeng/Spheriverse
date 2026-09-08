window.SPHERIVERSE_BENCHMARKS = {
  occupancy: {
    precision: 2,
    leader: 'SphereOcc',
    tables: [
      {
        caption: 'Overall and Class-wise Semantic Occupancy Results',
        note: 'mIoU, GeoIoU, and class-wise IoU are reported in %.',
        values: 'overallClass',
        groups: [
          { label: 'Overall', columns: ['mIoU', 'GeoIoU'] },
          { label: 'Class-wise IoU', columns: ['Person', 'Vehicle', 'Bike', 'Building', 'Vegetation', 'Pillar', 'Road', 'Surface', 'Others'] },
        ],
      },
      {
        caption: 'Scene-wise Semantic Occupancy Results',
        note: 'mIoU and GeoIoU are reported in % for each major scene category.',
        values: 'scenes',
        groups: [
          { label: 'Expressway', columns: ['mIoU', 'GeoIoU'] },
          { label: 'Functional', columns: ['mIoU', 'GeoIoU'] },
          { label: 'Rural', columns: ['mIoU', 'GeoIoU'] },
          { label: 'Structural', columns: ['mIoU', 'GeoIoU'] },
          { label: 'Urban', columns: ['mIoU', 'GeoIoU'] },
        ],
      },
    ],
    rows: [
      { method: 'TPVFormer', overallClass: [12.21, 22.35, 4.07, 12.88, 8.54, 8.93, 14.00, 12.34, 34.92, 12.01, 2.21], scenes: [10.51, 25.00, 8.33, 23.72, 10.13, 19.78, 13.66, 32.23, 8.05, 17.49] },
      { method: 'SurroundOcc', overallClass: [12.05, 22.55, 1.65, 13.97, 5.16, 9.40, 14.08, 12.57, 36.58, 11.99, 3.07], scenes: [11.29, 25.36, 8.38, 23.39, 10.22, 20.23, 13.66, 34.79, 8.31, 17.49] },
      { method: 'OccDepth', overallClass: [11.63, 21.59, 3.21, 11.27, 7.25, 8.49, 13.26, 10.67, 35.74, 12.62, 2.16], scenes: [10.43, 24.41, 7.92, 23.14, 9.62, 18.82, 12.39, 32.38, 7.52, 16.49] },
      { method: 'MonoScene', overallClass: [11.44, 21.68, 2.49, 10.90, 6.95, 8.18, 13.55, 10.93, 36.62, 11.61, 1.75], scenes: [10.35, 24.46, 8.12, 23.02, 9.79, 18.85, 12.34, 32.18, 7.49, 16.74] },
      { method: 'OccDepth + DA', overallClass: [11.42, 21.97, 2.41, 12.04, 7.22, 7.85, 13.44, 10.68, 35.06, 12.26, 1.83], scenes: [10.23, 24.77, 7.47, 23.38, 9.78, 19.23, 12.42, 32.51, 7.37, 16.91] },
      { method: 'QuadricFormer', overallClass: [11.09, 20.76, 0.00, 11.09, 4.51, 8.09, 12.45, 12.59, 37.62, 11.91, 1.54], scenes: [10.05, 23.66, 8.02, 22.80, 8.94, 17.56, 12.70, 33.07, 6.73, 15.31] },
      { method: 'ProtoOcc + DA', overallClass: [11.07, 20.77, 2.96, 12.36, 7.84, 7.29, 13.18, 8.94, 35.04, 10.06, 1.95], scenes: [9.84, 22.98, 7.43, 22.37, 9.93, 18.53, 12.67, 28.72, 7.82, 17.01] },
      { method: 'ProtoOcc', overallClass: [10.93, 21.02, 3.30, 12.12, 6.52, 7.18, 13.08, 8.45, 34.47, 11.11, 2.13], scenes: [9.78, 23.45, 7.82, 22.95, 9.71, 18.84, 11.86, 28.39, 7.55, 17.10] },
      { method: 'CoTR', overallClass: [9.72, 19.23, 1.97, 11.47, 6.11, 6.71, 12.18, 7.33, 29.84, 9.85, 1.97], scenes: [8.41, 21.37, 6.71, 20.29, 9.10, 17.61, 9.47, 24.60, 6.69, 15.99] },
      { method: 'GaussianFormer', overallClass: [9.16, 18.04, 0.00, 9.05, 4.62, 5.82, 9.26, 9.21, 34.96, 9.22, 0.32], scenes: [7.58, 19.48, 7.16, 20.62, 7.57, 15.23, 10.50, 29.67, 5.87, 13.95] },
      { method: 'BEVFormer', overallClass: [8.22, 18.37, 0.20, 5.36, 1.42, 6.61, 10.09, 10.12, 28.80, 10.05, 1.33], scenes: [7.34, 20.72, 6.13, 21.11, 7.34, 16.18, 8.42, 26.00, 4.45, 13.48] },
      { method: 'SphereOcc', overallClass: [13.91, 24.65, 3.02, 15.71, 7.50, 10.25, 15.57, 16.60, 39.99, 13.01, 3.53], scenes: [12.82, 27.02, 10.17, 25.90, 11.32, 22.43, 16.60, 39.04, 9.64, 19.32] },
    ],
  },

  mapping: {
    precision: 2,
    leader: 'OneBEV',
    tables: [
      {
        caption: 'Overall BEV Semantic Mapping Results',
        note: 'Class-wise IoU and mIoU are reported in %.',
        values: 'overallClass',
        groups: [
          { label: 'Overall', columns: ['mIoU'] },
          { label: 'Class-wise IoU', columns: ['Participant', 'Building', 'Vegetation', 'Pillar', 'Road', 'Surface', 'Others'] },
        ],
      },
      {
        caption: 'Scene-wise BEV Semantic Mapping Results',
        note: 'mIoU is reported in % using the globally selected checkpoint and thresholds.',
        values: 'scenes',
        groups: [
          { label: 'Major Scene Category', columns: ['Expressway', 'Functional', 'Rural', 'Structural', 'Urban'] },
        ],
      },
    ],
    rows: [
      { method: 'OneBEV', overallClass: [22.66, 18.84, 19.23, 24.76, 18.51, 52.53, 19.67, 5.05], scenes: [20.67, 16.69, 21.57, 23.15, 14.60] },
      { method: 'HDMapNet', overallClass: [20.71, 10.50, 19.80, 23.75, 17.03, 48.98, 19.00, 5.89], scenes: [19.57, 15.25, 19.49, 20.28, 13.45] },
      { method: 'PivotNet', overallClass: [19.93, 11.42, 17.01, 23.47, 15.75, 47.23, 19.21, 5.43], scenes: [18.58, 13.95, 19.26, 18.58, 12.75] },
      { method: 'SparseBEV', overallClass: [19.62, 11.27, 16.73, 22.68, 16.36, 46.94, 18.33, 5.01], scenes: [17.81, 14.48, 18.60, 18.55, 12.73] },
      { method: 'VectorMapNet', overallClass: [19.38, 10.27, 16.04, 22.35, 15.15, 47.53, 19.61, 4.74], scenes: [17.93, 14.56, 18.47, 18.76, 12.46] },
      { method: 'BEVFormer', overallClass: [18.17, 10.65, 14.26, 21.20, 13.78, 45.51, 17.73, 4.08], scenes: [16.81, 13.47, 16.86, 17.58, 12.52] },
      { method: 'PETRv2', overallClass: [18.16, 8.80, 15.87, 21.65, 12.76, 44.49, 18.88, 4.68], scenes: [16.99, 13.68, 16.65, 17.48, 12.14] },
      { method: 'SeqBEV', overallClass: [16.37, 7.44, 12.43, 20.63, 11.69, 40.66, 18.30, 3.48], scenes: [14.55, 10.11, 15.61, 15.28, 9.53] },
      { method: 'MapTR', overallClass: [15.83, 8.73, 11.80, 20.70, 9.98, 40.76, 16.12, 2.73], scenes: [13.70, 11.97, 16.27, 13.15, 10.06] },
      { method: 'TPVFormer', overallClass: [15.64, 10.03, 11.85, 18.35, 8.44, 39.70, 17.51, 3.61], scenes: [11.24, 10.83, 16.79, 12.55, 10.99] },
    ],
  },

  detection: {
    precision: 4,
    leader: 'SparseBEV',
    tables: [
      {
        caption: 'Overall 3D Object Detection Results',
        note: 'mAP and NDS follow the nuScenes evaluation protocol.',
        values: 'overall',
        groups: [{ label: 'Overall', columns: ['mAP', 'NDS'] }],
      },
      {
        caption: 'Scene-wise 3D Object Detection Results',
        note: 'mAP and NDS are reported for all five major scene categories.',
        values: 'scenes',
        groups: [
          { label: 'Expressway', columns: ['mAP', 'NDS'] },
          { label: 'Functional', columns: ['mAP', 'NDS'] },
          { label: 'Rural', columns: ['mAP', 'NDS'] },
          { label: 'Structural', columns: ['mAP', 'NDS'] },
          { label: 'Urban', columns: ['mAP', 'NDS'] },
        ],
      },
    ],
    rows: [
      { method: 'SparseBEV', overall: [0.1689, 0.1221], scenes: [0.1250, 0.0972, 0.0531, 0.0636, 0.0833, 0.0829, 0.3175, 0.2124, 0.1976, 0.1367] },
      { method: 'DenseBEV', overall: [0.0941, 0.0874], scenes: [0.0701, 0.0687, 0.0266, 0.0411, 0.0398, 0.0519, 0.1864, 0.1313, 0.1207, 0.0962] },
      { method: 'BEVFormer', overall: [0.0941, 0.0806], scenes: [0.0813, 0.0691, 0.0232, 0.0409, 0.0433, 0.0516, 0.1821, 0.1068, 0.1115, 0.0858] },
      { method: 'PolarBEVDet', overall: [0.1364, 0.1086], scenes: [0.1110, 0.0925, 0.0709, 0.0593, 0.0721, 0.0595, 0.2565, 0.1900, 0.1467, 0.1179] },
      { method: 'SOLOFusion', overall: [0.1316, 0.1017], scenes: [0.1175, 0.0926, 0.0674, 0.0668, 0.0648, 0.0504, 0.2970, 0.1996, 0.1452, 0.1124] },
      { method: 'DETR3D', overall: [0.1296, 0.0996], scenes: [0.1009, 0.0822, 0.0314, 0.0478, 0.0619, 0.0675, 0.2113, 0.1438, 0.1538, 0.1126] },
      { method: 'CoIn3D', overall: [0.1078, 0.0939], scenes: [0.0868, 0.0805, 0.0508, 0.0604, 0.0526, 0.0466, 0.2743, 0.2075, 0.1167, 0.1010] },
      { method: 'PD-BEV', overall: [0.1178, 0.0985], scenes: [0.1021, 0.0891, 0.0722, 0.0733, 0.0647, 0.0514, 0.2648, 0.2040, 0.1233, 0.1041] },
      { method: 'GeoBEV', overall: [0.0654, 0.0715], scenes: [0.0579, 0.0653, 0.0242, 0.0305, 0.0312, 0.0332, 0.1122, 0.0725, 0.0735, 0.0764] },
    ],
  },
};
