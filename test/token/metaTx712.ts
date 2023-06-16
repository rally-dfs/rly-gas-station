export interface MetaTransaction {
  name?: string;
  version?: string;
  salt?: string;
  verifyingContract?: string;
  nonce: number;
  from: string;
  functionSignature: string;
}

export interface Permit {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
  owner: string;
  spender: string;
  value: number | string;
  nonce: number | string;
  deadline: number | string;
}

export const getTypedMetaTransactionData = ({
  name,
  version,
  salt,
  verifyingContract,
  nonce,
  from,
  functionSignature,
}: MetaTransaction) => {
  return {
    types: {
      MetaTransaction: [
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "from",
          type: "address",
        },
        {
          name: "functionSignature",
          type: "bytes",
        },
      ],
    },
    domain: {
      name,
      version,
      verifyingContract,
      salt,
    },
    primaryType: "MetaTransaction",
    message: {
      nonce,
      from,
      functionSignature,
    },
  };
};

export const getTypedPermitData = ({
  name,
  version,
  chainId,
  verifyingContract,
  owner,
  spender,
  value,
  nonce,
  deadline,
}: Permit) => {
  return {
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain: {
      name,
      version,
      chainId,
      verifyingContract,
    },
    message: {
      owner,
      spender,
      value,
      nonce,
      deadline,
    },
  };
};
