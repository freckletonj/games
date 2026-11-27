// Packed, vertex-colored GLB subset shared by the player and converted scenery.
export function readGlb(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2)
    throw Error("Expected glTF 2.0 GLB");
  const jsonLength = view.getUint32(12, true);
  const document = JSON.parse(
    new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)),
  );
  function accessor(index) {
    const a = document.accessors[index],
      v = document.bufferViews[a.bufferView];
    const dimensions = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    const Type = {
      5121: Uint8Array,
      5123: Uint16Array,
      5125: Uint32Array,
      5126: Float32Array,
    }[a.componentType];
    return new Type(
      bytes.buffer,
      bytes.byteOffset +
        28 +
        jsonLength +
        (v.byteOffset || 0) +
        (a.byteOffset || 0),
      a.count * dimensions,
    );
  }
  return { document, accessor };
}
