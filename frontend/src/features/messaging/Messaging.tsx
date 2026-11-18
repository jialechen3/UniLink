import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUp, MessageSquareText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { Conversation, Message } from '../../types'
import { formatRelativeTime } from '../../utils/format'
import { EmptyState, ErrorState, LoadingState } from '../shared/Feedback'

export function MessageCenter() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(Boolean(conversationId))
  const [threadError, setThreadError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadThreads() {
    setThreadsLoading(true)
    setThreadError('')
    try { setConversations(await api<Conversation[]>('/conversations')) }
    catch (reason) { setThreadError(reason instanceof Error ? reason.message : 'Conversations could not be loaded.') }
    finally { setThreadsLoading(false) }
  }
  async function loadMessages(id: string) {
    setMessagesLoading(true)
    setMessageError('')
    try { setMessages(await api<Message[]>(`/conversations/${id}/messages`)) }
    catch (reason) { setMessageError(reason instanceof Error ? reason.message : 'Messages could not be loaded.') }
    finally { setMessagesLoading(false) }
  }
  useEffect(() => { void loadThreads() }, [])
  useEffect(() => { if (conversationId) void loadMessages(conversationId); else setMessages([]) }, [conversationId])

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!conversationId || !body.trim()) return
    setBusy(true)
    setMessageError('')
    try {
      const sent = await api<Message>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ body: body.trim() }) })
      setMessages((current) => [...current, sent])
      setBody('')
    } catch (reason) { setMessageError(reason instanceof Error ? reason.message : 'Your message could not be sent.') }
    finally { setBusy(false) }
  }

  const active = conversations.find((conversation) => String(conversation.id) === conversationId)
  return <section className="messages-view"><div className="view-title-row"><div><span className="eyebrow">CAMPUS MARKETPLACE</span><h1>Messages</h1><p className="muted">Coordinate a handoff, right here on campus.</p></div></div>
    <div className="message-layout"><aside className="thread-list" aria-label="Conversations"><div className="thread-list-heading">Your conversations</div>
      {threadsLoading ? <LoadingState label="Loading conversations" /> : threadError ? <ErrorState message={threadError} onRetry={() => void loadThreads()} /> : conversations.length ? conversations.map((conversation) => <Link key={conversation.id} to={`/messages/${conversation.id}`} className={`thread-item${conversation.id.toString() === conversationId ? ' selected' : ''}`}><span className="thread-avatar">{conversation.other_user_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="thread-copy"><strong>{conversation.other_user_name}</strong><span>{conversation.listing_title}</span><small>{formatRelativeTime(conversation.created_at)}</small></span></Link>) : <div className="thread-empty">No conversations yet.</div>}
    </aside>
    <section className="message-thread" aria-label="Message thread">
      {conversationId ? <>
        <div className="thread-header"><MessageSquareText size={18} /><div><strong>{active?.other_user_name ?? 'Conversation'}</strong><span>{active?.listing_title ?? 'Campus listing'}</span></div></div>
        <div className="message-history">{messagesLoading ? <LoadingState label="Loading messages" /> : messageError && !messages.length ? <ErrorState message={messageError} onRetry={() => void loadMessages(conversationId)} /> : messages.length ? messages.map((message) => <div className={`message-bubble${message.sender_id === user?.id ? ' message-mine' : ''}`} key={message.id}><span>{message.sender_name}</span><p>{message.body}</p><small>{formatRelativeTime(message.created_at)}</small></div>) : <EmptyState title="Start the conversation" detail="Send a note to coordinate a safe campus handoff." />}</div>
        {messageError && messages.length > 0 && <p className="inline-error" role="alert">{messageError}</p>}
        <form className="message-composer" onSubmit={send}><label className="sr-only" htmlFor="message-body">Write a message</label><textarea id="message-body" rows={2} value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} /><button className="button button-primary" aria-label="Send message" disabled={busy || !body.trim()}><ArrowUp size={18} />{busy ? 'Sending' : 'Send'}</button></form>
      </> : <div className="thread-prompt"><MessageSquareText size={26} /><h2>Select a conversation</h2><p>Choose a student on the left to see your messages.</p></div>}
    </section></div>
  </section>
}