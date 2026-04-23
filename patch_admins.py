import re

with open('frontend/src/pages/ManageAdmins.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize line endings
content = content.replace('\r\n', '\n')

old_snippet = '                         {!admin.password_changed_at && <Bell className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}'

new_snippet = '''                         {!admin.password_changed_at && (
                           <button onClick={e => { e.stopPropagation(); handleSendReminder(admin.id, admin.email); }}
                             title="Send password reset reminder" className="p-1 rounded-full hover:bg-rose-100 transition-colors">
                             <Bell className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                           </button>
                         )}'''

# Also add expiry + password pills after the closing </div></div></div> of the card body
old_close = '''                   </div>
                </div>
            </div>
          ))
        )}
      </div>'''

new_close = '''                   </div>

                   {admin.role === 'auditor' && admin.account_expiry_date && (() => {
                     const diff = new Date(admin.account_expiry_date) - now;
                     if (diff <= 0) return (
                       <div className="mt-3 w-full flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl">
                         <Clock className="w-3 h-3 flex-shrink-0" /> Access Expired
                       </div>
                     );
                     const d = Math.floor(diff / 86400000);
                     const h = Math.floor((diff / 3600000) % 24);
                     const m = Math.floor((diff / 60000) % 60);
                     return (
                       <div className="mt-3 w-full flex items-center gap-1.5 text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 rounded-xl">
                         <Clock className="w-3 h-3 flex-shrink-0" /> {d > 0 ? d + 'd ' : ''}{h}h {m}m left
                       </div>
                     );
                   })()}

                   <div className={`mt-2 w-full flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl ${admin.password_changed_at ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'}`}>
                     {admin.password_changed_at
                       ? <><ShieldCheck className="w-3 h-3 flex-shrink-0" />&nbsp;Password secure</>
                       : <><Bell className="w-3 h-3 flex-shrink-0 animate-pulse" />&nbsp;Never changed</>}
                   </div>
                </div>
            </div>
          ))
        )}
      </div>'''

if old_snippet in content:
    content = content.replace(old_snippet, new_snippet, 1)
    print("Bell icon fixed")
else:
    print("Bell snippet NOT found")

if old_close in content:
    content = content.replace(old_close, new_close, 1)
    print("Expiry + password pills added")
else:
    print("Close snippet NOT found")
    # Debug: find approximate location
    idx = content.find('</div>\n                </div>\n            </div>\n          ))\n        )}\n      </div>')
    print(f"Approx close found at index: {idx}")

with open('frontend/src/pages/ManageAdmins.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("File written.")
