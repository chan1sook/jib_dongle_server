<template>
  <div class="h-screen flex flex-col">
    <div class="flex-1 overflow-y-auto">
      <HomePage v-if="page === 'home'" @setPage="setPage"></HomePage>
      <GenerateKeysPage v-else-if="page === 'generateKeys'" @setPage="setPage"></GenerateKeysPage>
      <DeployValidatorsPage v-else-if="page === 'deployValidators'" @setPage="setPage"></DeployValidatorsPage>
      <ValidatorManagement v-else-if="page === 'validatorManagement'" @setPage="setPage"></ValidatorManagement>
      <SirenInfo v-else-if="page === 'jbcSirenMonitor'" @setPage="setPage"></SirenInfo>
    </div>
    <div class="text-xs">
      <div class="px-1 py-1 cursor-pointer inline-block" @click="showLogs = !showLogs">Terminal Log</div>
      <div ref="logsDom" v-if="showLogs"
        class="p-2 bg-black text-white font-mono whitespace-pre-wrap h-[200px] w-full overflow-y-auto">
        {{ terminalLogs }}
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import HomePage from "~/components/HomePage.vue"
import GenerateKeysPage from "~/components/GenerateKeysPage.vue"
import DeployValidatorsPage from "~/components/DeployValidatorsPage.vue"
import ValidatorManagement from "~/components/ValidatorManagement.vue"
import SirenInfo from "~/components/SirenInfo.vue"

useHead({
  title: "JIB Validation Monitor",
});

const terminalLogs = ref("");
const showLogs = ref(false);
const page = ref("home");
const logsDom: Ref<HTMLDivElement | null> = ref(null);

let socket: import('socket.io-client').Socket | undefined;

function setPage(pageName: string) {
  page.value = pageName;
}

onMounted(() => {
  socket = useSocketIO(window.location);
  socket.on("terminalLogs", (chunk: string) => {
    const str = terminalLogs.value + chunk;
    const strLines = str.split("\n");
    if (strLines.length > 200) {
      strLines.splice(0, strLines.length - 200);
    }

    terminalLogs.value = strLines.join("\n");

    nextTick(() => {
      if (logsDom.value) {
        logsDom.value.scrollTop = logsDom.value.scrollHeight;
      }
    })
  })
})
</script>