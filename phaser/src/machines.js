// Machine positions use world pixels. A gear's home is its axle; other
// machines use the center of the walkable top.
export function machinePlatforms(specs){
  return specs.map(machine=>{
    const {kind,home,size}=machine;
    const position=kind==='gear'?[home[0],home[1]-size[1]/2]:home;
    return {...machine,position,previous:position,beltSpeed:0,fire:false};
  });
}

export function stepMachines(machines,tick){
  for(const machine of machines){
    machine.previous=machine.position;
    switch(machine.kind){
      case 'conveyor':
        machine.beltSpeed=machine.speed;
        if(machine.tread)machine.tread.tilePositionX=-tick*machine.speed;
        break;
      case 'gear':
        machine.beltSpeed=machine.turn*machine.size[1]/2;
        machine.visual?.setRotation(tick*machine.turn);
        break;
      case 'piston': {
        const phase=tick%machine.period;
        machine.fire=phase===machine.fireTick;
        const extension=phase-machine.fireTick;
        const lift=extension>0&&extension<30?28*Math.sin(Math.PI*extension/30):0;
        machine.position=[machine.home[0],machine.home[1]-lift];
        machine.visual?.setPosition(...machine.position).setDisplaySize(
          machine.size[0],machine.size[1]+lift);
        machine.visual?.setTint(phase>=machine.fireTick-40&&phase<machine.fireTick?
          (Math.floor(phase/5)%2?0xffa55b:0xffffff):0xffffff);
        break;
      }
    }
  }
}
