import setupReadline from "../readline";
import read, { ReadError } from "../reader";
import evaluate, { EvalError } from "../eval";
import { DEFAULT_ENV } from "../core";
import print from "../printer";

const env = DEFAULT_ENV.extend();

const rl = setupReadline(env);

rl.prompt();
rl.on("line", (line: string) => {
  try {
    process.stdout.write(print(evaluate(read(line), env)) + "\n");
  } catch (e) {
    if (e instanceof ReadError || e instanceof EvalError) {
      console.error(`${e.constructor.name} : ${e.message}`);
    } else {
      throw e;
    }
  }
  rl.prompt();
});
