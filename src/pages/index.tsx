import type { NextPage } from 'next'

import Head from 'next/head'
import Link from 'next/link'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Verge Memory Leak Repro</title>
      </Head>
      <div>Verge Memory Leak Repro</div>
      <Link href="/read">Verge Page</Link>
    </>
  )
}

export default Home
