import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8000);

app.listen(port, () => {
  console.log(`EnergyMind API is listening on port ${port}`);
});
