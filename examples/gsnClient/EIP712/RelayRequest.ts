import { ForwardRequest } from "./ForwardRequest";
import { RelayData } from "./RelayData";

export interface RelayRequest {
  request: ForwardRequest;
  relayData: RelayData;
}
