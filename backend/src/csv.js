const COLUMN_ALIASES = {
  timestamp: ["timestamp", "datetime", "date_time", "время", "дата"],
  roomId: ["room_id", "room", "premise_id", "помещение", "аудитория"],
  consumptionKwh: [
    "consumption_kwh",
    "energy_kwh",
    "kwh",
    "потребление_квтч",
    "потребление"
  ]
};

function splitCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  cells.push(value.trim());
  return cells;
}

function getColumnIndex(headers, aliases) {
  return headers.findIndex((header) =>
    aliases.includes(header.trim().toLowerCase())
  );
}

export function parseConsumptionCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV должен содержать заголовок и хотя бы одну запись.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const timestampIndex = getColumnIndex(headers, COLUMN_ALIASES.timestamp);
  const roomIndex = getColumnIndex(headers, COLUMN_ALIASES.roomId);
  const consumptionIndex = getColumnIndex(headers, COLUMN_ALIASES.consumptionKwh);

  if ([timestampIndex, roomIndex, consumptionIndex].some((index) => index === -1)) {
    throw new Error(
      "CSV должен содержать колонки timestamp, room_id и consumption_kwh."
    );
  }

  return lines.slice(1).map((line, lineIndex) => {
    const cells = splitCsvLine(line);
    const timestamp = new Date(cells[timestampIndex]);
    const roomId = cells[roomIndex]?.trim();
    const consumptionKwh = Number(cells[consumptionIndex]?.replace(",", "."));

    if (Number.isNaN(timestamp.valueOf()) || !roomId || !Number.isFinite(consumptionKwh) || consumptionKwh < 0) {
      throw new Error(`Некорректные данные в строке ${lineIndex + 2}.`);
    }

    return {
      timestamp: timestamp.toISOString(),
      roomId,
      consumptionKwh
    };
  });
}
