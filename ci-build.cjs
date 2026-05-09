const path = require("path");
const fs = require("fs/promises");

module.exports = async function ({
  github,
  context,
  core,
  glob,
  io,
  exec,
  getOctokit,
  require,
}) {
  async function globFiles(pattern) {
    return await (await glob.create(pattern)).glob();
  }

  async function execAt(commands, cwd, options) {
    return await exec.exec(commands[0], commands.slice(1), {
      cwd,
      ...options,
    });
  }

  const buildDir = path.resolve("./builddir");
  await io.mkdirP(buildDir);

  await execAt(
    ["git", "clone", "https://github.com/BepInEx/BepInEx.git"],
    buildDir,
  );

  await execAt(
    ["git", "am", "-3", ...(await globFiles("patches/BepInEx-build/*.patch"))],
    path.join(buildDir, "BepInEx"),
  );

  const projPath = path.join(
    buildDir,
    "BepInEx/Runtimes/Unity/BepInEx.Unity.IL2CPP/BepInEx.Unity.IL2CPP.csproj",
  );

  const proj = await fs.readFile(projPath, "utf8");
  // XXX: resolve the actual commit of Il2CppInterop that the current BepInEx depends
  await fs.writeFile(projPath, patchBepInExProj(proj, buildDir), "utf8");

  await execAt(
    ["git", "clone", "https://github.com/BepInEx/Il2CppInterop.git"],
    buildDir,
  );

  await execAt(
    ["git", "clone", "https://github.com/NeighTools/UnityDoorstop.git"],
    buildDir,
  );

  // seems the Il2CppInterop is about to merge v2, pin v1 here
  await execAt(
    ["git", "checkout", "f03c8f4ae507d47ea814f3d11d1ec6b0391c1576"],
    path.join(buildDir, "Il2CppInterop"),
  );

  await execAt(
    ["git", "am", "-3", ...(await globFiles("patches/Il2CppInterop/*.patch"))],
    path.join(buildDir, "Il2CppInterop"),
  );

  await execAt(
    ["git", "am", "-3", ...(await globFiles("patches/UnityDoorstop/*.patch"))],
    path.join(buildDir, "UnityDoorstop"),
  );

  await execAt(
    ["xmake", "f", "-p", "mingw", '--cflags="-fpermissive"'],
    path.join(buildDir, "UnityDoorstop"),
  );

  await execAt(["xmake", "build"], path.join(buildDir, "UnityDoorstop"));

  await execAt(
    ["bash", "build.sh", "--target", "PublishIllgamesFixes"],
    path.join(buildDir, "BepInEx"),
    {
      env: {
        ...process.env,
        BEPINEX_BUILDS_VERSION_SUFFIX: GetVersionSuffix(context),
      },
    },
  );
};

function GetVersionSuffix(context) {
  const { ref } = context;

  if (ref.startsWith("refs/tags/")) {
    const tag = ref.substring(10);
    const reg = /(\w+)-\w+\.(\w+)\+\w+\.(\w+)/;
    const matches = tag.match(reg);
    return `${matches[1]}+bep.${matches[2]}+p.${matches[3]}`;
  }

  return undefined;
}

function patchBepInExProj(proj, buildDir) {
  const replaces = [
    "Il2CppInterop.Generator",
    "Il2CppInterop.HarmonySupport",
    "Il2CppInterop.Runtime",
  ];

  const replacedMap = replaces.reduce((res, name) => {
    res[name] = false;
    return res;
  }, {});

  const lines = proj.split("\n");
  const resLines = [];

  for (const line of lines) {
    let newLine = line;

    for (replace of replaces) {
      const token = `Include="${replace}"`;
      const idx = line.indexOf(token);
      if (idx < 0) continue;

      const replaceRef = path.resolve(
        buildDir,
        `Il2CppInterop/${replace}/${replace}.csproj`,
      );

      newLine =
        line.substring(0, idx).replace("PackageReference", "ProjectReference") +
        `Include="${replaceRef}"` +
        line.substring(idx + token.length);

      replacedMap[replace] = true;

      break;
    }

    resLines.push(newLine);
  }

  const res = resLines.join("\n");

  console.log(`Replace csproj:\n${res}\n`);

  for (const [name, replaced] of Object.entries(replacedMap)) {
    if (replaced) continue;
    throw new Error(`Package ${name} not replaced!`);
  }

  return res;
}
