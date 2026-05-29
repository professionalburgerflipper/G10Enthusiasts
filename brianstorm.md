    IDEAS:

    -----------------------
     
    how we implement proximity:
    radius, or actually ON g10

	Radius Method:

	Generate large radius (420m? based on max speed of G10 as well as render) around a G10's last known location, if the user is within that radius, then they are considered to be on the G10. perhaps caching last 10 or so user locations to compare against incase bus has not updated location. 

	We can also compare speeds (compare recent user locs) of user and g10 speed for insurance...
	but being able to access the chat briefly on a stop will be really funny.

	
	
	G10 ARCHIVE?

	Store in a dababase all busses that are or have run the g10 route and store stuff like how many times it has ran the route and how many users have been on the route. Also store chat history by fleetNumber ??