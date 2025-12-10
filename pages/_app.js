// pages/_app.js

// Global CSS
import "../app/globals.css";
import "react-toastify/dist/ReactToastify.css";

//Import untuk nextauth
import { SessionProvider } from "next-auth/react";

import Head from "next/head";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";

// Komponen untuk menangani render hanya di client side
function NoSSR({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : null;
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Admin Panel - Chatbot Pendaftaran Sekolah</title>
        <meta
          name="description"
          content="Dashboard admin untuk mengelola chatbot pendaftaran sekolah"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <NoSSR>
        <Component {...pageProps} />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </NoSSR>
    </>
  );
}

export default MyApp;
