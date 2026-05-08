## Fixes

**Il2CppInterop**

- Fix DigitalCraft 3.1.2 launching crash.
- Correct interop IL generation for non-reference ValueType parameters marked as `[Out]`.
- Partially fix hooking to blittable `ref ValueType` argument.

**UnityDoorstop**

- Use hid.dll to bypass SVS anti-BepInEx detection of winhttp.dll.

## Install

Unpack to game root folder.

> [!NOTE]
> If you have existing BepInEx installed from HF_Patch, use `BepInEx-SVS-hid.dll-*.zip` for SVS, and `BepInEx-illgames-default-*.zip` for other games. This makes sure you don't have conflicting `winhttp.dll` and `hid.dll` UnityDoorstop loader.
