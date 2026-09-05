import type { Structure } from "./structure.js";
export interface Graph {
  readonly nodes: readonly {
    readonly name: string;
    readonly structure?: Structure;
  }[];
  readonly edges: readonly {
    readonly name: string;
    readonly from: string;
    readonly to: string;
  }[];
  readonly dependencies: readonly {
    readonly parent: string;
    readonly field: string | null;
    readonly conversion: string;
  }[];
  readonly operations: readonly {
    readonly name: string;
    readonly input: string;
    readonly output: string;
    readonly reads: readonly string[];
    readonly references: readonly string[];
    readonly calls: readonly {
      readonly kind: "conversion" | "operation";
      readonly name: string;
    }[];
  }[];
  readonly references: readonly {
    readonly name: string;
    readonly from: string;
    readonly field: string;
    readonly to: string;
    readonly key: string;
  }[];
}

export interface GraphItem {
  readonly kind: "representation" | "conversion" | "operation" | "reference";
  readonly name: string;
}

export type DependencyReason =
  | {
      readonly kind:
        | "input"
        | "output"
        | "read"
        | "reference-use"
        | "conversion-use"
        | "call"
        | "wrapped-value";
    }
  | {
      readonly kind:
        "field" | "reference-source" | "reference-target" | "record-field";
      readonly field: string;
    };

export interface DependencyLink {
  readonly dependency: GraphItem;
  readonly dependent: GraphItem;
  readonly reason: DependencyReason;
}
