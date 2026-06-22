"use strict";
// Delivery distance + charge helpers.
// Kept framework-agnostic so they can be unit-tested and reused by any controller.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DELIVERY_TIERS = void 0;
exports.haversineKM = haversineKM;
exports.quoteDelivery = quoteDelivery;
// Default admin-configurable tiers (mirrors Branch.deliveryCharges; used as fallback).
exports.DEFAULT_DELIVERY_TIERS = [
    { maxDistanceKM: 3, charge: 0 },
    { maxDistanceKM: 6, charge: 30 },
    { maxDistanceKM: 10, charge: 60 },
];
const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;
/** Great-circle distance between two lat/lng points, in kilometres. */
function haversineKM(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}
/**
 * Decide whether a delivery is allowed and how much it costs.
 * Tiers are sorted ascending by distance; the first tier whose maxDistanceKM
 * covers the distance wins. Anything beyond the branch radius is rejected.
 */
function quoteDelivery(branchLocation, customerLocation, radiusKM, tiers = exports.DEFAULT_DELIVERY_TIERS) {
    const distanceKM = Math.round(haversineKM(branchLocation, customerLocation) * 100) / 100;
    if (distanceKM > radiusKM) {
        return {
            eligible: false,
            distanceKM,
            charge: 0,
            message: `Sorry, delivery is currently available only within ${radiusKM} KM of this branch. Please choose Pickup or Dine-in.`,
        };
    }
    const sorted = [...tiers].sort((a, b) => a.maxDistanceKM - b.maxDistanceKM);
    const tier = sorted.find((t) => distanceKM <= t.maxDistanceKM);
    const charge = tier ? tier.charge : sorted[sorted.length - 1]?.charge ?? 0;
    return { eligible: true, distanceKM, charge };
}
