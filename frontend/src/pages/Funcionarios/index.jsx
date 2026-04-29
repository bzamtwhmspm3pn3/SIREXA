<div className="max-w-2xl mx-auto bg-gray-800 text-white p-6 rounded shadow-lg mt-8">
      <h1 className="text-2xl font-bold mb-4">🛠️ Cadastro de Técnico</h1>

      {erro && <p className="text-red-400 mb-3">{erro}</p>}
      {sucesso && <p className="text-green-400 mb-3">{sucesso}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="nome"
          placeholder="Nome completo"
          value={form.nome}
          onChange={handleChange}
          className="w-full p-2 bg-gray-700 rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 bg-gray-700 rounded"
          required
        />
        <input
          type="text"
          name="telefone"
          placeholder="Telefone"
          value={form.telefone}
          onChange={handleChange}
          className="w-full p-2 bg-gray-700 rounded"
        />
        <input
          type="text"
          name="cargo"
          placeholder="Cargo ou função"
          value={form.cargo}
          onChange={handleChange}
          className="w-full p-2 bg-gray-700 rounded"
        />
        <input
          type="text"
          name="empresaId"
          placeholder="ID da empresa associada"
          value={form.empresaId}
          onChange={handleChange}
          className="w-full p-2 bg-gray-700 rounded"
        />

        <button
          type="submit"
          className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded font-semibold"
        >
          Cadastrar Técnico
        </button>
      </form>
    </div>