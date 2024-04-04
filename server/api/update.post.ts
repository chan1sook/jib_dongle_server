import Axios from "axios";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const res = await Axios.patch(
    `http://localhost:${query.apiPort}/lighthouse/validators/${query.voting_pubkey}`,
    {
      enabled: query.state === "true",
    },
    {
      headers: {
        Authorization: `Bearer ${query.apiToken}`,
      },
    }
  );

  return res.data;
});
