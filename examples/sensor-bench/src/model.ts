import {
  booleanValue,
  codec,
  conversion,
  dateValue,
  graph,
  listCodec,
  nullable,
  nullableCodec,
  numberValue,
  record,
  recordCodec,
  text,
} from "@represent/core";
import { fromZod } from "@represent/zod";
import { z } from "zod";

const round = (value: number) => Math.round(value * 10) / 10;
export const temperature = codec({
  name: "Reported temperature",
  from: numberValue("Celsius", { min: -40, max: 125 }),
  to: numberValue("Fahrenheit", { min: -40, max: 257 }),
  encode: (value) => round((value * 9) / 5 + 32),
  decode: (value) => round(((value - 32) * 5) / 9),
});
export const unroundedTemperature = codec({
  name: "Unrounded temperature",
  from: temperature.encode.from,
  to: temperature.encode.to,
  encode: (value) => (value * 9) / 5 + 32,
  decode: (value) => ((value - 32) * 5) / 9,
});
const timestamp = codec({
  name: "Sensor time",
  from: dateValue("Reading time"),
  to: fromZod("Sensor timestamp", z.iso.datetime({ offset: true })),
  encode: (value) => value.toISOString(),
  decode: (value) => new Date(value),
});
export const reading = recordCodec({
  name: "Sensor reading",
  from: "Reading",
  to: "Reading API",
  fields: { time: timestamp, temperature: nullableCodec(temperature) },
});
export const sensorExchange = recordCodec({
  name: "Sensor batch exchange",
  from: "Sensor batch",
  to: "Sensor batch API",
  fields: {
    device: text("Device", { nonempty: true }),
    online: booleanValue("Online"),
    batteryPercent: numberValue("Battery percentage", {
      min: 0,
      max: 100,
      integer: true,
    }),
    samples: listCodec(reading),
  },
});
const summary = record("Sensor summary", {
  device: text("Summary device", { nonempty: true }),
  online: booleanValue("Summary online"),
  samples: numberValue("Sample count", { min: 0, integer: true }),
  available: numberValue("Available reading count", { min: 0, integer: true }),
  meanCelsius: nullable(numberValue("Mean Celsius", { min: -40, max: 125 })),
});
export const summarize = conversion({
  name: "Summarize sensor batch",
  from: sensorExchange.encode.from,
  to: summary,
  map(batch) {
    const readings = batch.samples.flatMap((sample) =>
      sample.temperature === null ? [] : [sample.temperature],
    );
    return {
      device: batch.device,
      online: batch.online,
      samples: batch.samples.length,
      available: readings.length,
      meanCelsius: readings.length
        ? round(
            readings.reduce((sum, value) => sum + value, 0) / readings.length,
          )
        : null,
    };
  },
});
export const sensorGraph = graph([
  sensorExchange.encode,
  sensorExchange.decode,
  summarize,
  unroundedTemperature.encode,
  unroundedTemperature.decode,
]);
