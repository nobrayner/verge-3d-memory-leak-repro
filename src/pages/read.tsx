import * as React from 'react'

import { NextPage } from 'next'
import Head from 'next/head'

import { ComicViewerWrapper } from 'components/comic-viewer-wrapper'

const DATA = {
  assetsPath: '/comics/thecomic/',
  gltfAssetName: 'ComicViewer1-2.gltf',
}

const Issue: NextPage = () => {
  return (
    <>
      <Head>
        {/* eslint-disable-next-line */}
        <script src="/verge/v3d.js"></script>
      </Head>
      <ComicViewerWrapper data={DATA} />
    </>
  )
}

export default Issue
