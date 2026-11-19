import { DeterministicSimulator, SCENARIOS, type Scenario } from './simulator.js';

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const args = process.argv.slice(2);
const seedText = option(args, '--seed') ?? args.find((arg) => /^\d+$/.test(arg));
const scenarioText =
  option(args, '--scenario') ?? args.find((arg) => SCENARIOS.includes(arg as Scenario));
const stepsText = option(args, '--steps') ?? args.filter((arg) => /^\d+$/.test(arg)).at(-1);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run sim -- --seed X [--scenario NAME] [--steps N]
Scenarios: ${SCENARIOS.join(', ')}`);
  process.exit(0);
}

const seed = seedText === undefined ? 1 : Number(seedText);
if (!Number.isInteger(seed)) {
  console.error('--seed must be an integer');
  process.exit(1);
}

const scenario = (scenarioText ?? 'isolated-leader') as Scenario;
if (!SCENARIOS.includes(scenario)) {
  console.error(`Unknown scenario: ${scenarioText}. Choose: ${SCENARIOS.join(', ')}`);
  process.exit(1);
}

const steps = stepsText === undefined ? 180 : Number(stepsText);
if (!Number.isInteger(steps) || steps < 1) {
  console.error('--steps must be a positive integer');
  process.exit(1);
}

const report = new DeterministicSimulator({ seed, scenario }).run(steps, 10);
console.log(JSON.stringify(report, null, 2));
