import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

const createTable = async () => {
  try {
    const params: CreateTableCommandInput = {
      TableName: "EcommerceTable",
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],

      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "inverse-index",
          KeySchema: [
            { AttributeName: "SK", KeyType: "HASH" },
            { AttributeName: "PK", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
    };

    const command = new CreateTableCommand(params);
    const response = await client.send(command);
    console.log(
      "Table created successfully:",
      response.TableDescription?.TableName
    );
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
