## Fixes

**BepInEx**

- Add all decrypted SVS metadata files, and patch BepInEx to load decrypted metadata matching game assembly version.

**Il2CppInterop**

- Fix DigitalCraft 3.1.2 launching crash.
- Revert an upstream patch causing multi-patches hooking crash.
- Correct interop IL generation for non-reference ValueType parameters marked as `[Out]`.
- Partially fix hooking to blittable `ref ValueType` argument.

**UnityDoorstop**

- Use hid.dll to bypass SVS anti-BepInEx detection of winhttp.dll.

## Install

Unpack to game root folder.

**[Troubleshooting](https://github.com/y0soro/BepInEx-Builds/wiki/Troubleshooting)**

> [!NOTE]
> Use `BepInEx-SVS-hid.dll-*.zip` for SVS, it has `hid.dll` and all decrypted metadatas included. For other games, use `BepInEx-illgames-default-*.zip` if you installed BepInEx from HF_Patch. This makes sure you don't have conflicting `winhttp.dll` and `hid.dll` UnityDoorstop loader.
