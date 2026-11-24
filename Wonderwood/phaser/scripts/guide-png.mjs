import {deflateSync} from 'node:zlib';

const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,i)=>{
  let crc=i;
  for(let bit=0;bit<8;bit++)
    crc=(crc&1)?(0xedb88320^(crc>>>1)):(crc>>>1);
  return crc>>>0;
});

function pngChunk(type,data){
  const name=Buffer.from(type,'ascii');
  const content=Buffer.concat([name,data]);
  let crc=0xffffffff;
  for(const byte of content)crc=table[(crc^byte)&255]^(crc>>>8);
  const result=Buffer.alloc(12+data.length);
  result.writeUInt32BE(data.length,0);
  name.copy(result,4);
  data.copy(result,8);
  result.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);
  return result;
}

export function rgbaPng(width,height,rows){
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6; // 8-bit RGBA
  return Buffer.concat([
    signature,pngChunk('IHDR',header),
    pngChunk('IDAT',deflateSync(rows,{level:6})),
    pngChunk('IEND',Buffer.alloc(0))
  ]);
}
