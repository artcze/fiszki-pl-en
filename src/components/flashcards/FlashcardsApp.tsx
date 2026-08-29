import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { createFlashcardsClient, getApiErrorMessage } from "@/lib/flashcards-client";
import { FLASHCARD_TEXT_MAX_LENGTH, type Flashcard } from "@/lib/flashcards";
import { TRANSLATION_WORD_MAX_LENGTH } from "@/lib/translations";

const client = createFlashcardsClient();

const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 outline-none transition-colors focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-60";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function validateWord(word: string): string | null {
  const trimmedWord = word.trim();
  if (!trimmedWord || /\s/u.test(trimmedWord)) {
    return "Podaj jedno niepuste polskie słowo.";
  }
  return null;
}

export default function FlashcardsApp() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listRequest, setListRequest] = useState(0);

  const [word, setWord] = useState("");
  const [candidateWord, setCandidateWord] = useState<string | null>(null);
  const [translations, setTranslations] = useState<string[]>([]);
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPolish, setEditPolish] = useState("");
  const [editEnglish, setEditEnglish] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; message: string } | null>(null);

  const translationRequest = useRef<{ controller: AbortController; version: number } | null>(null);
  const translationVersion = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    void client
      .listFlashcards(controller.signal)
      .then((loadedFlashcards) => {
        setFlashcards(loadedFlashcards);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setListError(getApiErrorMessage(error, "Nie udało się pobrać fiszek. Spróbuj ponownie."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsListLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [listRequest]);

  useEffect(() => {
    return () => {
      translationRequest.current?.controller.abort();
    };
  }, []);

  function clearTranslationResult() {
    setCandidateWord(null);
    setTranslations([]);
    setSelectedTranslation(null);
  }

  function handleWordChange(nextWord: string) {
    translationVersion.current += 1;
    translationRequest.current?.controller.abort();
    translationRequest.current = null;
    setIsTranslating(false);
    setWord(nextWord);
    clearTranslationResult();
    setTranslationError(null);
    setCreationStatus(null);
  }

  async function handleTranslationSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isTranslating || isCreating) return;

    const submittedWord = word.trim();
    const validationError = validateWord(submittedWord);
    if (validationError) {
      clearTranslationResult();
      setTranslationError(validationError);
      return;
    }

    translationRequest.current?.controller.abort();
    const controller = new AbortController();
    const version = translationVersion.current + 1;
    translationVersion.current = version;
    translationRequest.current = { controller, version };

    clearTranslationResult();
    setTranslationError(null);
    setCreationStatus(null);
    setIsTranslating(true);

    try {
      const candidates = await client.translateWord(submittedWord, controller.signal);
      if (translationVersion.current !== version || controller.signal.aborted) return;

      setCandidateWord(submittedWord);
      setTranslations(candidates);
    } catch (error) {
      if (translationVersion.current === version && !isAbortError(error)) {
        setTranslationError(getApiErrorMessage(error, "Nie udało się pobrać tłumaczenia. Spróbuj ponownie."));
      }
    } finally {
      if (translationVersion.current === version) {
        translationRequest.current = null;
        setIsTranslating(false);
      }
    }
  }

  async function handleCreate() {
    if (isCreating || !candidateWord || !selectedTranslation) return;

    setIsCreating(true);
    setTranslationError(null);
    setCreationStatus(null);

    try {
      const flashcard = await client.createFlashcard({
        polish: candidateWord,
        english: selectedTranslation,
      });
      setFlashcards((current) => [flashcard, ...current]);
      setWord("");
      clearTranslationResult();
      setCreationStatus("Fiszka została zapisana.");
    } catch (error) {
      setTranslationError(getApiErrorMessage(error, "Nie udało się zapisać fiszki. Spróbuj ponownie."));
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(flashcard: Flashcard) {
    if (updatingId || deletingId) return;
    setEditingId(flashcard.id);
    setEditPolish(flashcard.polish);
    setEditEnglish(flashcard.english);
    setConfirmingDeleteId(null);
    setCardError(null);
  }

  function cancelEditing() {
    if (updatingId) return;
    setEditingId(null);
    setEditPolish("");
    setEditEnglish("");
    setCardError(null);
  }

  async function handleUpdate(event: SubmitEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (updatingId || deletingId) return;

    const polish = editPolish.trim();
    const english = editEnglish.trim();
    if (!polish || !english) {
      setCardError({ id, message: "Podaj niepuste polskie słowo i angielskie tłumaczenie." });
      return;
    }

    setUpdatingId(id);
    setCardError(null);

    try {
      const updated = await client.updateFlashcard(id, { polish, english });
      setFlashcards((current) => current.map((flashcard) => (flashcard.id === id ? updated : flashcard)));
      setEditingId(null);
      setEditPolish("");
      setEditEnglish("");
    } catch (error) {
      setCardError({ id, message: getApiErrorMessage(error, "Nie udało się zaktualizować fiszki.") });
    } finally {
      setUpdatingId(null);
    }
  }

  function startDeleteConfirmation(id: string) {
    if (updatingId || deletingId) return;
    setConfirmingDeleteId(id);
    setEditingId(null);
    setCardError(null);
  }

  async function handleDelete(id: string) {
    if (updatingId || deletingId) return;

    setDeletingId(id);
    setCardError(null);

    try {
      await client.deleteFlashcard(id);
      setFlashcards((current) => current.filter((flashcard) => flashcard.id !== id));
      setConfirmingDeleteId(null);
    } catch (error) {
      setCardError({ id, message: getApiErrorMessage(error, "Nie udało się usunąć fiszki.") });
    } finally {
      setDeletingId(null);
    }
  }

  const isCardMutationPending = updatingId !== null || deletingId !== null;

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="new-flashcard-heading"
        className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl sm:p-6"
      >
        <h2 id="new-flashcard-heading" className="text-xl font-semibold text-white">
          Dodaj nową fiszkę
        </h2>
        <p className="mt-1 text-sm text-blue-100/60">Wpisz jedno polskie słowo, wybierz tłumaczenie i zapisz fiszkę.</p>

        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={handleTranslationSubmit}
          noValidate
        >
          <div className="flex-1">
            <label htmlFor="polish-word" className="mb-1 block text-sm text-blue-100/80">
              Polskie słowo
            </label>
            <input
              id="polish-word"
              value={word}
              maxLength={TRANSLATION_WORD_MAX_LENGTH}
              onChange={(event) => {
                handleWordChange(event.target.value);
              }}
              disabled={isCreating}
              aria-invalid={translationError ? true : undefined}
              aria-describedby={translationError ? "translation-error" : undefined}
              placeholder="np. zamek"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <Button
            type="submit"
            disabled={isTranslating || isCreating || !word.trim()}
            className="bg-purple-600 text-white hover:bg-purple-500 sm:min-w-36"
          >
            {isTranslating ? "Tłumaczenie…" : "Przetłumacz"}
          </Button>
        </form>

        {translationError && (
          <p
            id="translation-error"
            role="alert"
            className="mt-3 rounded-lg border border-red-500/30 bg-red-900/30 px-3 py-2 text-sm text-red-200"
          >
            {translationError}
          </p>
        )}
        {creationStatus && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-200"
          >
            {creationStatus}
          </p>
        )}

        {translations.length > 0 && candidateWord && (
          <fieldset className="mt-5" disabled={isCreating}>
            <legend className="text-sm font-medium text-blue-100/80">
              Wybierz tłumaczenie słowa <span className="text-white">„{candidateWord}”</span>
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {translations.map((translation) => {
                const selected = selectedTranslation === translation;
                return (
                  <label
                    key={translation}
                    className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-purple-400 ${
                      selected
                        ? "border-purple-300 bg-purple-500/30 text-white"
                        : "border-white/15 bg-white/5 text-blue-100/80 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="translation"
                      value={translation}
                      checked={selected}
                      onChange={() => {
                        setSelectedTranslation(translation);
                        setTranslationError(null);
                      }}
                      className="mr-2 accent-purple-500"
                    />
                    {translation}
                  </label>
                );
              })}
            </div>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!selectedTranslation || isCreating}
              className="mt-4 bg-purple-600 text-white hover:bg-purple-500"
            >
              {isCreating ? "Zapisywanie…" : "Zapisz wybrane tłumaczenie"}
            </Button>
          </fieldset>
        )}
      </section>

      <section aria-labelledby="flashcards-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="flashcards-heading" className="text-xl font-semibold text-white">
            Twoje fiszki
          </h2>
          {!isListLoading && !listError && flashcards.length > 0 && (
            <span className="text-sm text-blue-100/50">Liczba fiszek: {flashcards.length}</span>
          )}
        </div>

        {isListLoading && (
          <p role="status" className="text-sm text-blue-100/70">
            Ładowanie fiszek…
          </p>
        )}

        {!isListLoading && listError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-900/30 p-4 text-sm text-red-200">
            <p>{listError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-red-300/40 bg-transparent text-red-100 hover:bg-red-500/20"
              onClick={() => {
                setIsListLoading(true);
                setListError(null);
                setListRequest((current) => current + 1);
              }}
            >
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {!isListLoading && !listError && flashcards.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-blue-100/60">
            Nie masz jeszcze żadnych fiszek. Przetłumacz pierwsze słowo powyżej.
          </p>
        )}

        {!isListLoading && !listError && flashcards.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {flashcards.map((flashcard) => {
              const isEditing = editingId === flashcard.id;
              const isConfirmingDelete = confirmingDeleteId === flashcard.id;
              const isUpdating = updatingId === flashcard.id;
              const isDeleting = deletingId === flashcard.id;

              return (
                <li key={flashcard.id} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  {isEditing ? (
                    <form onSubmit={(event) => void handleUpdate(event, flashcard.id)} className="space-y-3" noValidate>
                      <div>
                        <label htmlFor={`polish-${flashcard.id}`} className="mb-1 block text-sm text-blue-100/70">
                          Polskie słowo
                        </label>
                        <input
                          id={`polish-${flashcard.id}`}
                          value={editPolish}
                          maxLength={FLASHCARD_TEXT_MAX_LENGTH}
                          onChange={(event) => {
                            setEditPolish(event.target.value);
                            setCardError(null);
                          }}
                          disabled={isUpdating}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor={`english-${flashcard.id}`} className="mb-1 block text-sm text-blue-100/70">
                          Angielskie tłumaczenie
                        </label>
                        <input
                          id={`english-${flashcard.id}`}
                          value={editEnglish}
                          maxLength={FLASHCARD_TEXT_MAX_LENGTH}
                          onChange={(event) => {
                            setEditEnglish(event.target.value);
                            setCardError(null);
                          }}
                          disabled={isUpdating}
                          className={inputClass}
                        />
                      </div>
                      {cardError?.id === flashcard.id && (
                        <p role="alert" className="text-sm text-red-300">
                          {cardError.message}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={isUpdating}>
                          {isUpdating ? "Zapisywanie…" : "Zapisz zmiany"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:border-purple-300 focus-visible:ring-purple-400/50"
                          disabled={isUpdating}
                          onClick={cancelEditing}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <dl>
                        <div>
                          <dt className="text-xs font-medium tracking-wide text-blue-100/50 uppercase">Polski</dt>
                          <dd className="mt-1 text-lg font-semibold text-white">{flashcard.polish}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="text-xs font-medium tracking-wide text-blue-100/50 uppercase">Angielski</dt>
                          <dd className="mt-1 text-lg text-purple-200">{flashcard.english}</dd>
                        </div>
                      </dl>

                      {cardError?.id === flashcard.id && (
                        <p role="alert" className="mt-3 text-sm text-red-300">
                          {cardError.message}
                        </p>
                      )}

                      {isConfirmingDelete ? (
                        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
                          <p className="text-sm text-red-100">Na pewno usunąć tę fiszkę?</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isDeleting}
                              onClick={() => void handleDelete(flashcard.id)}
                            >
                              {isDeleting ? "Usuwanie…" : "Tak, usuń"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isDeleting}
                              onClick={() => {
                                setConfirmingDeleteId(null);
                              }}
                            >
                              Anuluj
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:border-purple-300 focus-visible:ring-purple-400/50"
                            disabled={isCardMutationPending}
                            onClick={() => {
                              startEditing(flashcard);
                            }}
                          >
                            Edytuj
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isCardMutationPending}
                            onClick={() => {
                              startDeleteConfirmation(flashcard.id);
                            }}
                          >
                            Usuń
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
