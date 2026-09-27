/* eslint-disable @next/next/no-img-element -- Display provider images directly without server image proxying. */
"use client";
import { useState } from "react";
import type { Listing } from "@/lib/types";
export function FlatCard({
  flat,
  onSelect,
}: {
  flat: Listing;
  onSelect?: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="card flat-card">
      {flat.imageUrls[0] && !imageFailed ? (
        <img
          className="flat-image"
          src={flat.imageUrls[0]}
          alt={flat.title}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flat-placeholder">
          <span>&#8962;</span>
          <small>
            {flat.sample ? "FICTIONAL SAMPLE FLAT" : "Photo not provided"}
          </small>
        </div>
      )}
      <div className="card-body">
        <span className="eyebrow">
          {flat.neighborhood ?? "Neighborhood not provided"}
        </span>
        <h2>{flat.title}</h2>
        <p className="rent">
          ${flat.monthlyRent.toLocaleString()} <small>/ month total</small>
        </p>
        <p>
          {flat.bedrooms === undefined
            ? "Beds not provided"
            : `${flat.bedrooms} beds`}{" "}
          <span className="dot">·</span>{" "}
          {flat.bathrooms === undefined
            ? "Baths not provided"
            : `${flat.bathrooms} baths`}
          {flat.squareFeet
            ? ` · ${flat.squareFeet.toLocaleString()} sq ft`
            : ""}
        </p>
        <p className="hint">
          {flat.sample ? "Sample data generated at " : "Retrieved at "}
          {new Date(flat.retrievedAt).toLocaleString()}
        </p>
        <div className="actions">
          {onSelect && (
            <button className="button" onClick={onSelect}>
              Choose this flat &#8594;
            </button>
          )}
          {flat.originalUrl && (
            <a
              className="text-link"
              href={flat.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Original listing &#8594;
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
