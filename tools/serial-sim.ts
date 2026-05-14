/**
 * Serial Reader — Simulador de Equipamento Serial
 *
 * Abre uma porta serial e envia payloads formatados em intervalos regulares,
 * simulando o comportamento de equipamentos de laboratório (balança, pH-metro, etc.).
 *
 * Pré-requisito: criar par de portas virtuais com socat (Linux) ou com0com (Windows).
 * Ver README.md → seção "Simulador serial" para instruções detalhadas.
 *
 * Uso:
 *   node dist/tools/serial-sim.js --port <caminho> [--preset <nome>] [--interval <ms>] [--count <n>] [--baud <taxa>]
 *   node dist/tools/serial-sim.js --list-presets
 */

import { SerialPort } from "serialport";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Preset {
  description: string;
  /** Regex sugerida para configurar o equipamento no app */
  exampleRegex: string;
  generate(): string;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function rand(min: number, max: number, decimals: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ─── Presets de equipamentos ──────────────────────────────────────────────────

const PRESETS: Record<string, Preset> = {
  balanca: {
    description: "Balança analítica — ex: '  1.2345 kg'",
    exampleRegex: "(\\d+\\.\\d+)\\s*kg",
    generate() {
      return `  ${rand(0.001, 50, 4).toFixed(4)} kg\r\n`;
    }
  },

  ph: {
    description: "pH-metro — ex: 'pH  7.23'",
    exampleRegex: "pH\\s*(\\d+\\.\\d+)",
    generate() {
      return `pH  ${rand(0, 14, 2).toFixed(2)}\r\n`;
    }
  },

  viscosimetro: {
    description: "Viscosímetro — ex: '125.3 mPa.s'",
    exampleRegex: "(\\d+\\.\\d+)\\s*mPa",
    generate() {
      return `${rand(1, 5000, 1).toFixed(1)} mPa.s\r\n`;
    }
  },

  espectrofotometro: {
    description: "Espectrofotômetro — ex: 'ABS:0.523'",
    exampleRegex: "ABS[:\\s]*(\\d+\\.\\d+)",
    generate() {
      return `ABS:${rand(0, 3, 3).toFixed(3)}\r\n`;
    }
  },

  generico: {
    description: "Genérico — número decimal simples",
    exampleRegex: "(\\d+\\.\\d+)",
    generate() {
      return `${rand(0, 9999, 4).toFixed(4)}\r\n`;
    }
  }
};

// ─── Parsing de argumentos ────────────────────────────────────────────────────

interface Args {
  port: string;
  preset: string;
  intervalMs: number;
  count: number;
  baudRate: number;
  listPresets: boolean;
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };

  return {
    port: flag("--port") ?? "",
    preset: flag("--preset") ?? "balanca",
    intervalMs: parseInt(flag("--interval") ?? "3000", 10),
    count: parseInt(flag("--count") ?? "0", 10),
    baudRate: parseInt(flag("--baud") ?? "9600", 10),
    listPresets: args.includes("--list-presets")
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.listPresets) {
    console.log("\nPresets disponíveis:\n");
    for (const [name, p] of Object.entries(PRESETS)) {
      console.log(`  ${name.padEnd(20)} ${p.description}`);
      console.log(`  ${"".padEnd(20)} regex sugerida: ${p.exampleRegex}`);
      console.log();
    }
    return;
  }

  if (!args.port) {
    console.error(
      [
        "Serial Reader — Simulador de Equipamento",
        "",
        "Uso:",
        "  node dist/tools/serial-sim.js --port <caminho> [opções]",
        "  node dist/tools/serial-sim.js --list-presets",
        "",
        "Opções:",
        "  --port <caminho>   Porta serial (ex: /dev/pts/5, COM4)",
        "  --preset <nome>    Tipo de equipamento (padrão: balanca)",
        "  --interval <ms>    Intervalo entre leituras em ms (padrão: 3000)",
        "  --count <n>        Quantidade de leituras; 0 = infinito (padrão: 0)",
        "  --baud <taxa>      Baud rate (padrão: 9600)",
        "  --list-presets     Lista os presets disponíveis",
        "",
        "Exemplos:",
        "  node dist/tools/serial-sim.js --port /dev/pts/5 --preset balanca",
        "  node dist/tools/serial-sim.js --port COM4 --preset ph --interval 2000 --count 5"
      ].join("\n")
    );
    process.exit(1);
  }

  const preset = PRESETS[args.preset];
  if (!preset) {
    console.error(`Preset desconhecido: "${args.preset}". Use --list-presets para ver os disponíveis.`);
    process.exit(1);
  }

  console.log(`[sim] Porta:     ${args.port}`);
  console.log(`[sim] Preset:    ${args.preset} — ${preset.description}`);
  console.log(`[sim] Intervalo: ${args.intervalMs} ms`);
  console.log(`[sim] Contagem:  ${args.count === 0 ? "infinita (Ctrl+C para parar)" : args.count}`);
  console.log(`[sim] Baud rate: ${args.baudRate}`);
  console.log(`[sim] Regex ex:  ${preset.exampleRegex}`);
  console.log();

  const port = new SerialPort({
    path: args.port,
    baudRate: args.baudRate,
    autoOpen: false
  });

  await new Promise<void>((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });

  console.log("[sim] Porta aberta. Enviando leituras...\n");

  let sent = 0;
  let stopped = false;
  let timer: NodeJS.Timeout;

  const shutdown = (): void => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    port.close(() => {
      console.log("\n[sim] Porta fechada. Até mais!");
      process.exit(0);
    });
  };

  const sendReading = (): void => {
    if (stopped) return;
    const payload = preset.generate();
    port.write(payload, (err) => {
      if (err) {
        console.error(`[sim] Erro ao escrever: ${err.message}`);
        return;
      }
      sent++;
      const display = payload.replace(/\r?\n$/, "");
      console.log(`[sim] #${String(sent).padStart(4, "0")} → ${display}`);
      if (args.count > 0 && sent >= args.count) shutdown();
    });
  };

  sendReading();
  timer = setInterval(sendReading, args.intervalMs);

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err: unknown) => {
  console.error("[sim] Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
