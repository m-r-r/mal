import { createInterface } from "node:readline";
import read, { ReadError } from "../reader";
import print from "../printer";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "user> ",
});

rl.prompt();
rl.on("line", (line: string) => {
  try {
    console.log(print(read(line)));
  } catch (e) {
    if (e instanceof ReadError) {
      console.error(`Read error : ${e.message}`);
    } else {
      throw e;
    }
  }
  rl.prompt();
});
