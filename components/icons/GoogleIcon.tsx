import type { SVGProps } from 'react'

export default function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#EA4335"
        d="M12 10.8v3.84h5.38c-.23 1.25-.96 2.31-2.05 3.02l3.31 2.58c1.94-1.79 3.06-4.43 3.06-7.6 0-.73-.07-1.43-.2-2.12H12z"
      />
      <path
        fill="#34A853"
        d="M6.53 14.32a4.8 4.8 0 0 1-.25-1.52c0-.53.09-1.04.24-1.52L3.13 8.62A9.6 9.6 0 0 0 2.4 12.8c0 1.54.37 3 1.03 4.18z"
      />
      <path
        fill="#4A90E2"
        d="M12 19.2c1.98 0 3.64-.66 4.85-1.8l-3.31-2.58c-.64.43-1.46.68-2.35.68-1.81 0-3.34-1.23-3.89-2.88l-3.44 2.36C5.1 17.68 8.29 19.2 12 19.2"
      />
      <path
        fill="#FBBC05"
        d="M12 6.4c1.08 0 2.05.37 2.81 1.09l2.1-2.1C15.63 3.94 13.97 3.2 12 3.2 8.29 3.2 5.1 4.72 3.05 7.6l3.44 2.36C5.66 8.31 7.19 6.4 12 6.4"
      />
      <path fill="none" d="M2.4 2.4h19.2v19.2H2.4z" />
    </svg>
  )
}
