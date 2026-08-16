import { chunkText } from "./chunker";
const document = `
# Docker Networking

Docker networking allows containers to communicate with each other and with external networks.

## Bridge Network

The bridge network is the default network driver. Containers connected to the same bridge network can communicate with each other.

## Host Network

The host network removes network isolation between the container and the Docker host.

## Docker Compose

Docker Compose creates a default network for services. Services can communicate with each other using their service names.
;`
const chunks = chunkText(document, {
    maxCharacters: 250,
    overlapCharacters: 50,
});
for (const chunk of chunks) {
  console.log(`\n--- Chunk ${chunk.index} ---`);
  console.log(chunk.content);
}