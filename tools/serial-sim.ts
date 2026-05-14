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
  // Mettler Toledo MT-SICS: "S S" = stable, "S D" = dynamic (balance oscillating).
  // Balanças analíticas de laboratório transmitem em gramas, nunca em kg.
  balanca: {
    description: "Balança analítica Mettler Toledo MT-SICS — ex: 'S S     0.1234 g'",
    exampleRegex: "(\\d+\\.\\d+)\\s*g\\b",
    generate() {
      const stability = Math.random() > 0.1 ? "S" : "D";
      const value = rand(0.0001, 220, 4).toFixed(4).padStart(9);
      return `S ${stability}    ${value} g  \r\n`;
    }
  },

  // Mettler Toledo SevenEasy / Hanna Instruments modo compact printer.
  ph: {
    description: "pH-metro Mettler/Hanna (compact mode) — ex: 'pH  7.23'",
    exampleRegex: "pH\\s*(\\d+\\.\\d+)",
    generate() {
      return `pH  ${rand(0, 14, 2).toFixed(2)}\r\n`;
    }
  },

  // Brookfield DV-II+ modo CGS (padrão de fábrica): unidade cP (centipoise).
  // 1 cP = 1 mPa·s numericamente, mas Brookfield usa cP no output padrão.
  viscosimetro: {
    description: "Viscosímetro Brookfield (simplificado) — ex: '125.3 cP'",
    exampleRegex: "(\\d+\\.\\d+)\\s*cP",
    generate() {
      return `${rand(1, 50000, 1).toFixed(1)} cP\r\n`;
    }
  },

  // Linha completa do protocolo serial Brookfield DV-II+Pro.
  // Regex extrai o campo cP= da linha composta por múltiplos parâmetros.
  "viscosimetro-brookfield": {
    description: "Viscosímetro Brookfield DV-II+ (linha completa) — ex: 'RPM=  6.0 ... cP=  226.0 ...'",
    exampleRegex: "cP=\\s*(\\d+\\.\\d+)",
    generate() {
      const rpm = rand(0.3, 100, 1);
      const models = ["LV", "RV", "HA", "HB"] as const;
      const model = models[Math.floor(Math.random() * models.length)];
      const sp = String(Math.floor(Math.random() * 7) + 1).padStart(2, "0");
      const torque = rand(5, 99, 1);
      const cp = rand(10, 50000, 1);
      const shearRate = parseFloat((rpm * 1.7).toFixed(3));
      const shearStress = parseFloat((cp * shearRate / 10000).toFixed(2));
      const temp = rand(20, 35, 1);
      return (
        `RPM=${rpm.toFixed(1).padStart(5)} M=${model} S=${sp}` +
        ` %=${torque.toFixed(1).padStart(5)} cP=${cp.toFixed(1).padStart(8)}` +
        ` D/CM2=${shearStress.toFixed(2).padStart(7)} 1/SEC=${shearRate.toFixed(3).padStart(7)}` +
        ` T=${temp.toFixed(1)}C\r\n`
      );
    }
  },

  // Cecil CE / Thermo Spectronic: formato documentado com "Abs=" como label.
  // Regex cobre variantes: Abs=, Abs:, ABS= (primeira letra maiúscula ou toda caixa).
  espectrofotometro: {
    description: "Espectrofotômetro Cecil/Thermo — ex: 'Abs=0.523'",
    exampleRegex: "[Aa]bs[=:]\\s*(\\d+\\.\\d+)",
    generate() {
      return `Abs=${rand(0, 2, 3).toFixed(3)}\r\n`;
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
