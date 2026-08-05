/**
 * The line a caption is written along.
 *
 * The words follow the land, so the line is laid through the places the caption belongs to. A
 * stretch of a few cells is often shorter on the screen than the words naming it, and a letter that
 * falls off the end of its line is not drawn at all -- which letters those are would change with
 * every step of a pan, and the words would rebuild themselves as the map moves. So the line is
 * carried on straight past both ends, by more than the words can ever need.
 */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** Room to leave at each end for a caption of that many letters, drawn at that size. */
export function reachFor(text: string, fontSize: number): number {
    return text.length * fontSize;
}

/**
 * A smooth line through the points, carried on straight past both ends by that much. The middle of
 * the line stays the middle of the stretch, since both ends grow by the same amount.
 */
export function curveThrough(points: Point[], reach: number): string {
    const start = beyond(points[0], points[1], reach);
    const end = beyond(points[points.length - 1], points[points.length - 2], reach);
    if (points.length < 3) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }
    let path = `M ${start.x} ${start.y} L ${points[0].x} ${points[0].y}`;
    for (let at = 1; at < points.length - 1; ++at) {
        const middleX = (points[at].x + points[at + 1].x) / 2;
        const middleY = (points[at].y + points[at + 1].y) / 2;
        path += ` Q ${points[at].x} ${points[at].y} ${middleX} ${middleY}`;
    }
    const last = points[points.length - 1];
    return `${path} T ${last.x} ${last.y} L ${end.x} ${end.y}`;
}

/** As far beyond one point as asked, going away from the other: room for the words to run into. */
export function beyond(from: Point, towards: Point, reach: number): Point {
    const dx = from.x - towards.x;
    const dy = from.y - towards.y;
    const length = Math.hypot(dx, dy) || 1;
    return {x: from.x + reach * dx / length, y: from.y + reach * dy / length};
}
