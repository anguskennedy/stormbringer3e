export class StormActor extends Actor {
  prepareData() {
    super.prepareData();
    const data = this.system; // v10+

    // Example derived data: total HP equals CON (demo only)
    const con = Number(data.attributes?.con ?? 10);
    data.resources ??= {};
    data.resources.hp ??= { value: con, max: con };
  }
}