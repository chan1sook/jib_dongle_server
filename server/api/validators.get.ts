import Axios from "axios"

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const res = await Axios.get(`http://localhost:${query.apiPort}/lighthouse/validators`, {
    headers: {
      "Authorization": `Bearer ${query.apiToken}`
    }
  })

  return res.data as { data: ValidatorData[] };
})