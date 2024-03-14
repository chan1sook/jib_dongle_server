import path from "node:path";

export function getPaths() {
  const { LIGHTHOUSE_EXEC_PATH,
    JBC_KEYGEN_SCRIPT_PATH,
    VC_DEPLOY_TEMP,
    JBC_SIREN_TEMP,
    VC_KEYS_PATH,
  } = useRuntimeConfig();
  
  return {
    LIGHTHOUSE_EXEC_PATH,
    JBC_KEYGEN_SCRIPT_PATH,
    VC_DEPLOY_TEMP,
    JBC_SIREN_TEMP,
    VC_KEYS_PATH,
  };
}


export function isOverrideCheckFiles() {
  return typeof process.env.OVERRIDE_CHECK_FILES !== "undefined"
}

//##### config
export function programConfigPath() {
  return path.join(getPaths().VC_KEYS_PATH, "config.json");
}

//##### keygen
export function jbcKeygenDockerfilePath() {
  return path.join(getPaths().JBC_KEYGEN_SCRIPT_PATH, "./Dockerfile");
}

export function jbcKeygenGitUrl() {
  return "https://github.com/chan1sook/jbc-deposit-cli.git"
}
//##### chain configlocation
export function getChainConfigGitUrl() {
  return "https://github.com/jibchain-net/node.git";
}

export function getChainConfigGitSha256Checksum() {
  return "f2687cd88a0a2089cef1a9f474cfc0fd23125bfb557d45032d9e7777474249ca"
}

export function getChainConfigPath() {
  return path.join(getPaths().VC_DEPLOY_TEMP, "config/config.yaml");
}

export function getChainConfigDir() {
  return path.dirname(getChainConfigPath());
}


//##### lighthouse
const lhFileMap : DownloadFileInfoMap = {
  'x64': {
    url: "https://github.com/sigp/lighthouse/releases/download/v5.1.0/lighthouse-v5.1.0-x86_64-unknown-linux-gnu-portable.tar.gz",
    sha256: "6cea0139ed2573e7d695f1df70d5770c448e164a7411ec2eef898cdeb033b8d4",
    location: "lighthouse"
  },
  'arm64': {
    url: "https://github.com/sigp/lighthouse/releases/download/v5.1.0/lighthouse-v5.1.0-aarch64-unknown-linux-gnu-portable.tar.gz",
    sha256: "cc166282f2d101563235a369216019b84b17a2049ab95158a3f2ac257c6705df",
    location: "lighthouse"
  }
}

export function getLighhouseDownloadUrl() {
  const lhFileInfo = lhFileMap[process.arch]
  if (!lhFileInfo) {
    throw new Error("Platform not support")
  }

  return lhFileInfo.url;
}

export function getLighhouseSha256Checksum() {
  const lhFileInfo = lhFileMap[process.arch]
  if (!lhFileInfo) {
    throw new Error("Platform not support")
  }

  return lhFileInfo.sha256;
}

export function getLocalLighthousePath() {
  const lhFileInfo = lhFileMap[process.arch]
  if (!lhFileInfo) {
    throw new Error("Platform not support")
  }

  return path.join(getPaths().LIGHTHOUSE_EXEC_PATH, lhFileInfo.location);
}

//##### vc
export function validatorDockerComposeGroup() {
  return "jbc-validator"
}

export function validatorDockerComposePath() {
  return path.join(getPaths().VC_KEYS_PATH, "validator2.yaml");
}

export function lighthouseImageTag() {
  return "sigp/lighthouse:v5.1.0"
}

//##### siren
export function jbcSirenDockerComposeGroup() {
  return "jbc-siren"
}

export function getJbcSirenDownloadUrl() {
  return "https://github.com/chan1sook/jbc-siren/releases/download/1.0.0/jbc-siren.tar";
}

export function getJbcSirenSha256Checksum() {
  return "7653ec495ce8359f6e14a38f1538a435105bc19519eea9399f7e3c4428c9f10c"
}

export function jbcSirenDockerComposePath() {
  return path.join(getPaths().VC_KEYS_PATH, "jbc-siren.yaml");
}

export function getLocalJbcSirenDockerImagePath() {
  return path.join(getPaths().JBC_SIREN_TEMP, "jbc-siren.tar");
}