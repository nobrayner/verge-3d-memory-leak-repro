import * as React from "react";

import Link from "next/link";
import Script from "next/script";

import { useReadMachine } from "machines/read.machine";

type ComicViewerWrapperProps = {
  data: {
    assetsPath: string;
    gltfAssetName: string;
  };
};

const VERGE_CONTAINER_ID = "v3d-container";

export const ComicViewerWrapper = ({ data }: ComicViewerWrapperProps) => {
  const { vergeSettings, toggleVerge, init } = useReadMachine({
    containerId: VERGE_CONTAINER_ID,
    gltfAssetName: data.gltfAssetName,
    assetsPath: data.assetsPath,
  });

  return (
    <>
      <Script id="verge" src="/verge/v3d.js" onLoad={init}></Script>
      <label>
        <input
          type="checkbox"
          checked={vergeSettings?.enabled}
          onChange={toggleVerge}
        />
        Verge Enabled
      </label>
      &nbsp;
      <Link href="/">Back</Link>
      <div
        id={VERGE_CONTAINER_ID}
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          top: "40px",
          bottom: "0",
          maxWidth: "1440px",
          margin: "0 auto",
        }}
      />
    </>
  );
};
