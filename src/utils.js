// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const recursiveReaddir = require("recursive-readdir");
const path = require("path");
const fs = require("fs").promises;
const { prompt } = require("enquirer");
const { readFileSync } = require("fs");
const chalk = require("chalk");
const { spawnSync } = require("child_process");

const cleanup = (dirname) => {
  console.log(
    chalk.bold.blue("\nGeneration interrupted, cleaning up temp files...")
  );
  spawnSync("rm", ["-rf", dirname], { stdio: "inherit" });
  console.log(chalk.bold.blue("Cleaned up, exiting!"));
};

const generatorPrompt = (projectName) => {
  const promptState = {};
  return prompt([
    {
      type: "input",
      name: "projectName",
      message: "What would you like to call this extension?",
      default: projectName,
      result(value) {
        promptState.projectName = value;
        return value;
      },
    },
    {
      type: "select",
      name: "language",
      message: "What language would you like to use?",
      choices: ["Javascript", "Typescript"],
      result(value) {
        const res = value.toLowerCase();
        promptState.language = res;
        return res;
      },
    },
    {
      type: "select",
      name: "framework",
      message: "What framework would you like to use?",
      choices: ["React", "No framework"],
      result(value) {
        let parsed = value.toLowerCase();
        if (parsed === "no framework") {
          parsed = "vanilla";
        }
        promptState.framework = parsed;
        return parsed;
      },
    },
    {
      type: "confirm",
      name: "useRecommendedPackages",
      message:
        "Do you want to install all recommended packages for React? (swr, usehooks-ts, @looker/components, @looker/embed-sdk, @looker/sdk)",
      skip: () => promptState.framework !== "react",
      result(value) {
        promptState.useRecommendedPackages = value;
        if (value) {
          promptState.embedType = "Dashboard";
          promptState.useEmbedSDK = true;
          promptState.useLookerSDK = true;
          promptState.uiFramework = "@looker/components";
        }
        return value;
      },
    },
    {
      type: "multiselect",
      name: "features",
      message: "Select the features you want to include in your extension:",
      choices: [
        "Looker API",
        "Looker API artifact API",
        "User Attribute methods",
        "Looker Embed",
        "Server Proxy Request",
      ],
      result(value) {
        promptState.features = value;
        if (value.includes("Looker Embed")) {
          promptState.useEmbedSDK = true;
        } else {
          promptState.useEmbedSDK = false;
        }
        if (value.includes("Looker API")) {
          promptState.useLookerSDK = true;
        } else {
          promptState.useLookerSDK = false;
        }
        return value;
      },
    },
    {
      type: "select",
      name: "embedType",
      message: "Select the type of content to embed:",
      choices: ["Dashboard", "Explore", "Look"],
      skip: () =>
        promptState.useRecommendedPackages ||
        !promptState.features ||
        !promptState.features.includes("Looker Embed"),
      result(value) {
        promptState.embedType = value;
        return value;
      },
    },
    {
      type: "confirm",
      name: "useEmbedSDK",
      message: "Do you want to install the @looker/embed-sdk package?",
      skip: () => "useEmbedSDK" in promptState || promptState.useRecommendedPackages,
      result(value) {
        // promptState.useEmbedSDK = value;
        return promptState.useEmbedSDK;
      },
    },
    {
      type: "confirm",
      name: "useLookerSDK",
      message:
        "Do you want to install the @looker/sdk and @looker/sdk-rtl packages?",
      skip: () => "useLookerSDK" in promptState || promptState.useRecommendedPackages,
      result(value) {
        // promptState.useLookerSDK = value;
        return promptState.useLookerSDK;
      },
    },
    {
      type: "select",
      name: "uiFramework",
      message: "Which UI framework would you like to use?",
      choices: ["@looker/components", "@mui/material", "No UI framework"],
      skip: () =>
        promptState.framework !== "react" || promptState.useRecommendedPackages,
      result(value) {
        let parsed = value.toLowerCase();
        if (parsed === "no ui framework") {
          parsed = "none";
        }
        promptState.uiFramework = parsed;
        return parsed;
      },
    },
  ]).catch((e) => {
    console.error(chalk.bold.yellow(`Error receiving answers: ${e}`));
  });
};

const buildProject = async function (
  answers,
  templateDirectory,
  dynamicExtension,
  finalizeTemplate
) {
  templateDirectory =
    templateDirectory + "/" + answers["framework"] + "-" + answers["language"];
  const files = await recursiveReaddir(templateDirectory);
  const fileMap = {};
  files.forEach((file) => {
    const [, relativePath] = file.split(path.join(templateDirectory, path.sep));
    const adjustedRelativePath = relativePath.replace(dynamicExtension, "");
    if (fileMap[adjustedRelativePath]) {
      console.error(
        chalk.bold.yellow(
          `Error copying template files: Conflicting paths - ${adjustedRelativePath}`
        )
      );
    }

    if (path.extname(file) === dynamicExtension) {
      const fileOutput = require(file)(answers);
      if (fileOutput) {
        fileMap[adjustedRelativePath] = require(file)(answers);
      }
    } else {
      fileMap[adjustedRelativePath] = readFileSync(file, "utf8");
    }
  });

  const finalFiles = finalizeTemplate(fileMap, answers);
  await Promise.all(
    Object.keys(finalFiles).map(async (adjustedRelativePath_1) => {
      const finalPath = path.join(
        answers["projectName"],
        adjustedRelativePath_1
      );
      try {
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        return await fs.writeFile(
          finalPath,
          finalFiles[adjustedRelativePath_1]
        );
      } catch (error) {
        cleanup(answers["projectName"]);
        console.error(
          chalk.bold.yellow(`Error generating extension: ${error}`)
        );
      }
    })
  );
};

const installDependencies = async function (answers) {
  const installProcess = (dirname) =>
    spawnSync("npm", ["install"],
      {
      cwd: dirname,
      stdio: "inherit",
      shell: true,
    });

  console.log(chalk.blue.bold("Installing dependencies..."));
  try {
    const installation = await installProcess(answers["projectName"]);
    if (installation.signal === "SIGINT") {
      cleanup(answers["projectName"]);
      console.error(
        chalk.bold.yellow(
          `Dependency installation failed. See log lines above for detailed error information.`
        )
      );
      return false;
    }
    console.log(chalk.blue.bold("Extension created 🚀 🚀"));
    console.log(
      chalk(`To run your new extension, run the following commands:`)
    );
    console.log(chalk(`1.  cd ${answers["projectName"]} `));
    console.log(chalk(`2.  npm run dev:https`));
    console.log(
      chalk(
        `Once the npm server is running, follow the instructions in ${answers["projectName"]}/README.md to add it to your Looker instance.`
      )
    );
    console.log(
      chalk(`For documentation see: `),
      chalk.blue(
        `https://cloud.google.com/looker/docs/intro-to-extension-framework`
      )
    );
    return true;
  } catch (err) {
    cleanup(answers["projectName"]);
    console.error(
      chalk.bold.yellow("Error installing extension dependencies: ", err)
    );
    return false;
  }
};

module.exports = {
  cleanup,
  installDependencies,
  generatorPrompt,
  buildProject,
};
