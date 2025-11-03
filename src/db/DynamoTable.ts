import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";

// Create DynamoDB client
const client = new DynamoDBClient({ region: "us-east-1" });

const createTable = async () => {
  try {
    // Correcting the params type by adding proper types
    const params: CreateTableCommandInput = {
      TableName: "EcommerceTable", // Name of the table
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" }, // Partition key
        { AttributeName: "SK", KeyType: "RANGE" }, // Sort key
      ],
      // Attribute definitions only for the table's keys
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" }, // Partition key type (String)
        { AttributeName: "SK", AttributeType: "S" }, // Sort key type (String)
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "inverse-index", // Inverse Index
          KeySchema: [
            { AttributeName: "SK", KeyType: "HASH" }, // GSI Partition Key (original SK)
            { AttributeName: "PK", KeyType: "RANGE" }, // GSI Sort Key (original PK)
          ],
          Projection: {
            ProjectionType: "ALL", // Project all attributes
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
    };

    // Create the table with the command
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
