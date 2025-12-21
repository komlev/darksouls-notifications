import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";

const VALID_TYPES = ["firefox", "chrome"];
const NECESSARY_FILES = [
  "background.js",
  "OptimusPrinceps.ttf",
  "script.js",
  "sound.mp3",
  "style.css",
];
const PACKAGE_NAMES = {
  firefox: "firefox.xpi",
  chrome: "chrome.zip",
};

const [, , incomingType] = process.argv;
// JUST CHECKING FOR PROPER TYPE AND ALL SINCE WE ARE WORKING WITH FILES HERE
if (!VALID_TYPES.includes(incomingType)) {
  console.log(
    incomingType ? `Unknown type "${incomingType}"` : "Type is not provided",
  );
  process.exit(1);
}

const createTmpDirectory = (t) => {
  // CREATE CLEAN TMP DIRECTORY
  const tmpDir = `./tmp_${Date.now()}_${t}`;
  if (fs.existsSync(tmpDir)) {
    // SHOULD NOT HAPPEN
    console.log(`Directory ${tmpDir} already exists`);
    process.exit(1);
  }

  fs.mkdirSync(tmpDir);
  return tmpDir;
};

const cleanup = (dir) => {
  // REMOVE TMP DIRECTORY
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up directory ${dir}: ${error}`);
  }
};

const zipDirectory = (dir, zipFileName) => {
  childProcess.execSync(`zip -r ${zipFileName} *`, { cwd: dir });
};

const packExtension = (type) => {
  // GET CLEAN TMP DIRECTORY
  const tmpDirectory = createTmpDirectory(type);

  // COPY SHARED FILES TO TMP DIRECTORY
  NECESSARY_FILES.forEach((file) => {
    const sourcePath = path.resolve(file);
    const destinationPath = path.resolve(tmpDirectory, file);
    fs.copyFileSync(sourcePath, destinationPath);
  });

  // NOW COPY TYPE FILES TO TMP DIRECTORY
  fs.readdirSync(path.resolve(`./${type}`))
    .map((file) => file)
    .filter((file) => file.endsWith(".json") || file.endsWith(".png"))
    .forEach((file) => {
      const sourcePath = path.resolve(`${type}/${file}`);
      const destinationPath = path.resolve(tmpDirectory, file);
      fs.copyFileSync(sourcePath, destinationPath);
    });

  // PACK STUFF UP INTO ZIP FILE
  const zipFile = `${type}.zip`;
  zipDirectory(tmpDirectory, zipFile);
  // MAKE DIST DIRECTORY IF NOT EXISTS
  if (!fs.existsSync("./dist")) {
    fs.mkdirSync("./dist");
  }

  // MOVE ZIP FILE TO DIST DIRECTORY
  fs.renameSync(
    `./${tmpDirectory}/${zipFile}`,
    path.resolve("./dist", PACKAGE_NAMES[type]),
  );

  // CLEANUP
  cleanup(tmpDirectory);
};

packExtension(incomingType);
