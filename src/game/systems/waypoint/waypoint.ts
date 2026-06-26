// 航点(传送点)发现与查询的纯逻辑.
// 不直接 import AREAS, 以避免与世界数据/Game 形成硬依赖循环;
// 区域表由调用方(通常是 Game)以形参传入, 这里只关心 waypoint/name 两个字段.

// 已发现航点的区域 id 集合. 由 Game 持有(如 discoveredWaypoints), 渲染层只读.
export type WaypointState = Set<string>;

// 进入某区域时调用: 若该区域含航点, 则记入已发现集合(幂等).
export function discover(
  state: WaypointState,
  areaId: string,
  areas: Record<string, { waypoint?: boolean }>,
): void {
  if (areas[areaId]?.waypoint) state.add(areaId);
}

// 列出"已发现且确含航点"的区域, 按传入 areas 的键序返回 {id,name}.
// 双重校验 waypoint, 防止外部往 state 塞入非航点 id.
export function listWaypoints(
  state: WaypointState,
  areas: Record<string, { name: string; waypoint?: boolean }>,
): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const id of Object.keys(areas)) {
    const area = areas[id];
    if (area.waypoint && state.has(id)) out.push({ id, name: area.name });
  }
  return out;
}

// 某区域是否存在航点(与是否已发现无关).
export function hasWaypoint(
  areaId: string,
  areas: Record<string, { waypoint?: boolean }>,
): boolean {
  return !!areas[areaId]?.waypoint;
}
