# Nightfall 3 Unity Demo

This folder is the authored Unity 6000.3 project for the 2.5D demo. The existing web game remains available outside this folder while migration continues.

## Local gates

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.3.18f1/Unity.app/Contents/MacOS/Unity"

"$UNITY" -batchmode -nographics -quit -projectPath "$PWD/unity" \
  -executeMethod Nightfall3.Editor.DemoSceneBuilder.BuildScene -logFile unity-scene-build.log

"$UNITY" -batchmode -nographics -quit -projectPath "$PWD/unity" \
  -executeMethod Nightfall3.Editor.DemoValidation.ValidateFoundation -logFile unity-validation.log

"$UNITY" -batchmode -nographics -quit -projectPath "$PWD/unity" \
  -executeMethod Nightfall3.Editor.DemoBuildPipeline.BuildMac -logFile unity-mac-build.log

"unity/Builds/macOS/Nightfall3.app/Contents/MacOS/Nightfall 3 Demo" \
  -screen-fullscreen 0 -screen-width 1280 -screen-height 720 -qaCombat \
  -qaCapture /tmp/nightfall3-combat.png -logFile /tmp/nightfall3-combat.log
```

The runtime gate executes all four skills and fails if the authored four-enemy encounter takes no damage or the screenshot cannot be produced.

The foundation is intentionally not the visual-target milestone. Bridge sprites and procedural geometry must be replaced or materially upgraded before visual acceptance.
