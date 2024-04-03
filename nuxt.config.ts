// https://nuxt.com/docs/api/configuration/nuxt-config

import path from "node:path"
import { homedir } from "node:os"

const tempBasePath = "/tmp/";

export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
  ],
  runtimeConfig: {
    public: {
      sioPort: "3001"
    },
    LIGHTHOUSE_EXEC_PATH: path.join(tempBasePath, ".lighthouse"),
    JBC_KEYGEN_SCRIPT_PATH: path.join(tempBasePath, ".jib-keygen"),
    VC_DEPLOY_TEMP:  path.join(tempBasePath, ".vc-deployer"),
    JBC_SIREN_TEMP: path.join(tempBasePath, ".jib-siren"),
    VC_KEYS_PATH: path.join(homedir(), ".jib-lighthouse"),
  },
})
