import { createInterface } from "node:readline";
import read, { ReadError } from "../reader";
import evaluate, { EvalError } from "../eval";
import print from "../printer";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "user> ",
});

rl.prompt();
rl.on("line", (line: string) => {
  try {
    console.log(print(evaluate(read(line))));
  } catch (e) {
    if (e instanceof ReadError || e instanceof EvalError) {
      console.error(`${e.constructor.name} : ${e.message}`);
    } else {
      throw e;
    }
  }
  rl.prompt();
});
