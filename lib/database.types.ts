export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: number
          nombre: string
          tipo: string | null
          telefono: string | null
          email: string | null
          contacto: string | null
          direccion: string | null
          localidad: string | null
          provincia: string | null
          vendedor: string | null
          iva: string | null
          cuit: string | null
          nota: string | null
          estado: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      price_lists: {
        Row: {
          id: string
          client_id: number
          file_name: string
          description: string | null
          status: 'pending' | 'signed'
          pdf_url: string
          signed_pdf_url: string | null
          token: string
          uploaded_at: string
          signed_at: string | null
          signer_ip: string | null
          signer_ua: string | null
        }
        Insert: {
          client_id: number
          file_name: string
          description?: string | null
          pdf_url: string
          token?: string
        }
        Update: Partial<Database['public']['Tables']['price_lists']['Insert']> & {
          status?: 'pending' | 'signed'
          signed_pdf_url?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_ua?: string | null
        }
      }
    }
  }
}

// Tipos derivados útiles en toda la app
export type Client    = Database['public']['Tables']['clients']['Row']
export type PriceList = Database['public']['Tables']['price_lists']['Row']
export type PriceListWithClient = PriceList & { clients: Client }
