declare module 'validator';

type DownloadFileInfoMap =  Record<string, {url:string,sha256:string,location:string}> 

interface GenerateKeyResponse {
  mnemonic: string
  exportPath: string
  contents: Record<string, string>
}

interface DeployKeyAdvanceSetting {
  graffiti: string
  exposeLighhouseApiPort: string
}

interface LighhouseApiData {
  apiToken: string
  apiPort: number
}

interface DeployKeyResult {
  imported: number | undefined
  skipped: number | undefined
  apiToken?: string | undefined
  apiPort?: number | undefined
}

interface ValidatorData {
  voting_pubkey: string
  description: string
  enabled: boolean
}

interface ExitValidatorResult {
  currentEpoch: number | undefined
  exitEpoch: number | undefined
  withdrawableEpoch: number | undefined
  exitTs: number | undefined
}

interface VcConfigData {
  apiToken?: string
  apiPort?: number
  sirenPort?: number
}

interface DeploySirenResult {
  sirenPort: number
}