import { createInterface } from "node:readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "user> ",
});

rl.prompt();
rl.on("line", (line: string) => {
  console.log(line);
  rl.prompt();
});
