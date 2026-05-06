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
  const buildDir = path.resolve("./builddir");
  await io.mkdirP(buildDir);

  await exec.exec("git", ["clone", "https://github.com/BepInEx/BepInEx.git"], {
    cwd: buildDir,
  });

  await exec.exec(
    "git",
    ["apply", ...(await globFiles("patches/BepInEx-build/*.patch"))],
    {
      cwd: path.join(buildDir, "BepInEx"),
    },
  );

  const projPath = path.join(
    buildDir,
    "BepInEx/Runtimes/Unity/BepInEx.Unity.IL2CPP/BepInEx.Unity.IL2CPP.csproj",
  );

  var proj = await fs.readFile(projPath, "utf8");
  await fs.writeFile(projPath, patchBepInExProj(proj, buildDir), "utf8");

  await exec.exec(
    "git",
    ["clone", "https://github.com/BepInEx/Il2CppInterop.git"],
    {
      cwd: buildDir,
    },
  );

  await exec.exec(
    "git",
    ["clone", "https://github.com/NeighTools/UnityDoorstop.git"],
    {
      cwd: buildDir,
    },
  );

  // await exec.exec("git", ["checkout", "xxxxxxx"], {
  //   cwd: path.join(buildDir, "Il2CppInterop"),
  // });

  async function globFiles(pattern) {
    return await (await glob.create(pattern)).glob();
  }

  await exec.exec(
    "git",
    ["am", "-3", ...(await globFiles("patches/Il2CppInterop/*.patch"))],
    {
      cwd: path.join(buildDir, "Il2CppInterop"),
    },
  );

  await exec.exec(
    "git",
    ["am", "-3", ...(await globFiles("patches/UnityDoorstop/*.patch"))],
    {
      cwd: path.join(buildDir, "UnityDoorstop"),
    },
  );

  await exec.exec("xmake", ["f", "-p", "mingw"], {
    cwd: path.join(buildDir, "UnityDoorstop"),
  });

  await exec.exec(
    "xmake",
    [
      "f",
      "-p",
      "mingw",
      '--cflags="-Wno-error=int-conversion -Wno-error=incompatible-pointer-types"',
    ],
    {
      cwd: path.join(buildDir, "UnityDoorstop"),
    },
  );

  await exec.exec("xmake", ["build"], {
    cwd: path.join(buildDir, "UnityDoorstop"),
  });

  await exec.exec("bash", ["build.sh", "--target", "PublishIllgamesFixes"], {
    cwd: path.join(buildDir, "BepInEx"),
  });
};

function patchBepInExProj(proj, buildDir) {
  const replaces = [
    "Il2CppInterop.Generator",
    "Il2CppInterop.HarmonySupport",
    "Il2CppInterop.Runtime",
  ];

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

      break;
    }

    resLines.push(newLine);
  }

  const res = resLines.join("\n");

  console.log(`Replace csproj:\n${res}\n`);

  return res;
}
