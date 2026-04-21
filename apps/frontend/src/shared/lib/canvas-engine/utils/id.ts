import type { LayerId, NodeId } from "../core/types";

let nodeCounter = 0;
let layerCounter = 0;

export function createNodeId(prefix = "node"): NodeId {
  nodeCounter += 1;
  return `${prefix}-${nodeCounter}`;
}

export function createLayerId(prefix = "layer"): LayerId {
  layerCounter += 1;
  return `${prefix}-${layerCounter}`;
}