// https://nuxt.com/docs/api/configuration/nuxt-config

import path from "node:path";

export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  runtimeConfig: {
    public: {
      sioPort: "3001",
    },
    LIGHTHOUSE_EXEC_PATH: ".lighthouse",
    JBC_KEYGEN_SCRIPT_PATH: ".jib-keygen",
    VC_DEPLOY_TEMP: ".vc-deployer",
    JBC_SIREN_TEMP: ".jib-siren",
    VC_KEYS_PATH: ".jib-lighthouse",
  },
});
