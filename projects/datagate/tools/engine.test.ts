// Checks on the analysis engine. The whole point of DataGate is that its
// numbers are real, so the numbers get tested.
//
//   npm test

import { parseText, coerce } from "../src/app/lib/parse";
import { profileTable } from "../src/app/lib/profile";
import { demoCSV, toCleanedCSV } from "../src/app/lib/report";

let failures = 0;
let checks = 0;

function check(name: string, actual: unknown, expected: unknown) {
  checks++;
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    failures++;
    console.error(`  ✗ ${name}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

function near(name: string, actual: number, expected: number, tolerance = 1e-6) {
  checks++;
  if (Math.abs(actual - expected) > tolerance) {
    failures++;
    console.error(`  ✗ ${name}\n      expected ≈${expected}\n      got      ${actual}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("\ncoercion");
check("plain integer", coerce("42"), 42);
check("decimal", coerce("3.5"), 3.5);
check("thousands separator", coerce("1,234.5"), 1234.5);
check("accounting negative", coerce("(500)"), -500);
check("currency", coerce("$19.99"), 19.99);
check("blank becomes null", coerce("  "), null);
check("NA becomes null", coerce("N/A"), null);
check("boolean", coerce("true"), true);
// Zero-padded values are identifiers — turning 007 into 7 destroys the data.
check("zero-padded stays text", coerce("007"), "007");
check("free text", coerce("North"), "North");

console.log("\nCSV parsing");
const quoted = parseText(
  ['id,name,note', '1,"Smith, John","said ""hello"""', '2,Ann,"line one\nline two"'].join("\n"),
  "t.csv",
);
check("row count with embedded newline", quoted.rows.length, 2);
check("delimiter inside quotes", quoted.rows[0].name, "Smith, John");
check("escaped quotes", quoted.rows[0].note, 'said "hello"');
check("newline inside quotes", quoted.rows[1].note, "line one\nline two");

console.log("\ndelimiter sniffing");
check("semicolons", parseText("a;b;c\n1;2;3", "t.txt").columns, ["a", "b", "c"]);
check("tabs", parseText("a\tb\n1\t2", "t.txt").columns, ["a", "b"]);
// A prose column full of commas must not beat the real delimiter.
check("prose does not fool it", parseText("a|b\nhi, there, you|2", "t.txt").columns, ["a", "b"]);

console.log("\nragged and duplicate headers");
const ragged = parseText("a,b,c\n1,2\n3,4,5,6", "t.csv");
check("short row pads with null", ragged.rows[0].c, null);
check("duplicate header renamed", parseText("a,a\n1,2", "t.csv").columns, ["a", "a_2"]);

console.log("\nJSON");
const nested = parseText('[{"user":{"id":1,"city":"Ann Arbor"},"tags":[1,2]}]', "t.json");
check("nested key flattened", nested.columns.includes("user.id"), true);
check("array summarised", nested.rows[0].tags, "[2 items]");
const wrapped = parseText('{"meta":1,"results":[{"a":1},{"a":2,"b":3}]}', "t.json");
check("array found inside an object", wrapped.rows.length, 2);
check("sparse keys unioned", wrapped.rows[0].b, null);
check("jsonl detected", parseText('{"a":1}\n{"a":2}', "t.txt").format, "jsonl");

console.log("\nstatistics");
// 1..9 has a median of 5, quartiles at 3 and 7, and a sample std dev of 2.7386.
const stats = profileTable(parseText(`v\n${[1, 2, 3, 4, 5, 6, 7, 8, 9].join("\n")}`, "t.csv"));
const v = stats.columns[0].numeric!;
near("median", v.median, 5);
near("p25", v.p25, 3);
near("p75", v.p75, 7);
near("mean", v.mean, 5);
near("sum", v.sum, 45);
near("sample std dev", v.stdDev, 2.7386127875258306, 1e-9);
check("histogram totals the row count", v.histogram.reduce((s, b) => s + b.count, 0), 9);

// 1..10 plus 500: the outlier sits far outside 1.5 × IQR.
const withOutlier = profileTable(parseText(`v\n${[...Array(10)].map((_, i) => i + 1).join("\n")}\n500`, "t.csv"));
check("outlier detected", withOutlier.columns[0].numeric!.outlierCount, 1);
check("outlier value", withOutlier.columns[0].numeric!.outliers, [500]);

console.log("\ncorrelation");
// y = 2x is a perfect positive relationship; z runs exactly against it.
const correlated = profileTable(parseText("x,y,z\n1,2,9\n2,4,8\n3,6,7\n4,8,6\n5,10,5", "t.csv"));
const xy = correlated.correlations.find((c) => (c.a === "x" && c.b === "y") || (c.a === "y" && c.b === "x"))!;
const xz = correlated.correlations.find((c) => (c.a === "x" && c.b === "z") || (c.a === "z" && c.b === "x"))!;
near("perfect positive r", xy.r, 1, 1e-9);
near("perfect negative r", xz.r, -1, 1e-9);

console.log("\ntype inference");
const types = profileTable(
  parseText(
    ["id,region,price,active,seen", "1,North,9.5,true,2026-01-04", "2,South,3.25,false,2026-02-11", "3,North,7.0,true,2026-03-09"].join("\n"),
    "t.csv",
  ),
);
const kind = (name: string) => types.columns.find((c) => c.name === name)!.kind;
check("decimal", kind("price"), "decimal");
check("boolean", kind("active"), "boolean");
check("date", kind("seen"), "date");
check("low-cardinality text is a category", kind("region"), "categorical");

// A short all-distinct integer column is still a measurement; a long one is a key.
const shortIds = profileTable(parseText(`id\n${[1, 2, 3, 4, 5].join("\n")}`, "t.csv"));
check("short distinct integers stay numeric", shortIds.columns[0].kind, "integer");
const longIds = profileTable(parseText(`id\n${[...Array(40)].map((_, i) => i + 1).join("\n")}`, "t.csv"));
check("long distinct integers are identifiers", longIds.columns[0].kind, "identifier");
check("identifiers are left out of correlations", longIds.correlations.length, 0);

console.log("\nfindings");
const messy = profileTable(parseText(["a,b,c", "1,x,", "1,x,", "2,x,"].join("\n"), "t.csv"));
check("duplicate row counted", messy.duplicateRows, 1);
check("constant column flagged", messy.findings.some((f) => f.id === "constant-b"), true);
check("empty column flagged", messy.findings.some((f) => f.id === "empty-c"), true);
check("critical sorts first", messy.findings[0].severity, "critical");

const mixed = profileTable(parseText("v\n1\n2\nunknown\n4", "t.csv"));
check("mixed types flagged", mixed.findings.some((f) => f.id === "mixed-v"), true);
check(
  "integer and decimal together are not a conflict",
  profileTable(parseText("v\n1\n2.5\n3\n4.25", "t.csv")).findings.some((f) => f.id === "mixed-v"),
  false,
);

console.log("\ncleaned export");
const messyTable = parseText(["a,b,c", "1,x,", "1,x,", "2,x,"].join("\n"), "t.csv");
const cleaned = toCleanedCSV(messyTable, profileTable(messyTable));
check("dead columns dropped", cleaned.split("\n")[0], "a");
check("duplicate row dropped", cleaned.split("\n").length, 3);

console.log("\ndemo dataset");
const demoTable = parseText(demoCSV(), "orders.csv");
const demo = profileTable(demoTable);
check("demo row count", demo.rows, 903);
check("demo has the planted duplicates", demo.duplicateRows, 3);
check("demo has missing satisfaction scores", demo.columns.find((c) => c.name === "satisfaction")!.missing > 0, true);
const shipping = demo.correlations.find(
  (c) => [c.a, c.b].includes("shipping_days") && [c.a, c.b].includes("satisfaction"),
)!;
check("planted relationship is found and is negative", shipping.r < -0.5, true);
check("order_id reads as an identifier", demo.columns.find((c) => c.name === "order_id")!.kind, "identifier");

console.log(`\n${checks - failures}/${checks} passed`);
if (failures > 0) {
  console.error(`${failures} failed`);
  process.exit(1);
}
