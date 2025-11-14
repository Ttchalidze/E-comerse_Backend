import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { ddb } from "./dyClient";

export async function inversePkQuery(pkVAlue: string) {
  const params = {
    TableName: "EcommerceTable",
    IndexName: "inverse-index",
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: pkVAlue },
    },
  };
  try {
    const reqComand = new QueryCommand(params);
    const response = await ddb.send(reqComand);
    return response.Items;
  } catch (error) {
    console.error("error querying table", error);
  }
}
